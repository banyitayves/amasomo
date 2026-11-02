import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const app = express()
const port = Number(process.env.PORT) || 3001
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

function fail(status, message) {
  const error = new Error(message)
  error.status = status
  throw error
}

function localized(value, language) {
  return value?.[language] ?? value?.en ?? ''
}

function requireText(value, label, max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail(400, `${label} is required and must be under ${max} characters.`)
  }
  return value.trim()
}

function requireTranslations(value, label, max = 5000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, `${label} must include translations.`)
  for (const language of ['rw', 'en', 'sw', 'fr']) requireText(value[language], `${label} (${language})`, max)
  return value
}

async function run(query) {
  const { data, error } = await query
  if (error) {
    const failure = new Error(error.message)
    failure.status = 400
    throw failure
  }
  return data
}

async function authenticate(req, _res, next) {
  try {
    if (!supabase) fail(503, 'The Supabase API is not configured.')
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) fail(401, 'Please sign in to continue.')
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) fail(401, 'Your session has expired. Please sign in again.')
    req.user = data.user
    next()
  } catch (error) {
    next(error)
  }
}

function requireAdmin(req, _res, next) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!configuredEmail || req.user.email?.toLowerCase() !== configuredEmail) {
    return next(Object.assign(new Error('Administrator access is required.'), { status: 403 }))
  }
  next()
}

app.get('/api/health', async (_req, res) => {
  if (!supabase) return res.status(503).json({ status: 'not_ready', error: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the API.' })
  const { error } = await supabase.from('subjects').select('id').limit(1)
  if (error) return res.status(503).json({ status: 'not_ready', error: 'Supabase is unavailable or the learning schema has not been installed.' })
  res.json({ status: 'ok' })
})

app.use('/api', authenticate)

app.get('/api/auth/me', (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.user_metadata?.display_name || '',
      isAdmin: Boolean(process.env.ADMIN_EMAIL?.trim() && req.user.email?.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()),
    },
  })
})

app.get('/api/subjects', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const rows = await run(supabase.from('subjects')
    .select('id,name,description,icon,color,topics(id,title,description,sort_order)')
    .order('sort_order'))
  res.json({ subjects: rows.map((subject) => ({
    ...subject,
    name: localized(subject.name, language),
    description: localized(subject.description, language),
    topics: (subject.topics || []).sort((a, b) => a.sort_order - b.sort_order)
      .map((topic) => ({ ...topic, title: localized(topic.title, language), description: localized(topic.description, language) })),
  })) })
})

app.get('/api/topics/:topicId', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const topic = await run(supabase.from('topics').select('id,title,description,subject_id').eq('id', req.params.topicId).maybeSingle())
  if (!topic) return res.status(404).json({ error: 'Topic not found.' })
  const [lessons, questions] = await Promise.all([
    run(supabase.from('lessons').select('id,topic_id,title,summary,content,media_url,sort_order').eq('topic_id', topic.id).order('sort_order')),
    run(supabase.from('questions').select('id,topic_id,prompt,options,explanation,sort_order').eq('topic_id', topic.id).eq('question_type', 'exercise').order('sort_order')),
  ])
  res.json({
    topic: { ...topic, title: localized(topic.title, language), description: localized(topic.description, language) },
    lessons: lessons.map((lesson) => ({
      ...lesson,
      title: localized(lesson.title, language),
      summary: localized(lesson.summary, language),
      content: localized(lesson.content, language),
    })),
    exercises: questions.map((question) => ({
      ...question,
      prompt: localized(question.prompt, language),
      explanation: localized(question.explanation, language),
      options: Object.fromEntries(Object.entries(question.options || {}).map(([key, value]) => [key, localized(value, language)])),
    })),
  })
})

app.get('/api/lessons/:lessonId', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const lesson = await run(supabase.from('lessons')
    .select('id,topic_id,title,summary,content,media_url,topics(id,title,subject_id)')
    .eq('id', req.params.lessonId).maybeSingle())
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  const completion = await run(supabase.from('lesson_completions').select('lesson_id')
    .eq('lesson_id', lesson.id).eq('user_id', req.user.id).maybeSingle())
  res.json({ lesson: {
    ...lesson,
    title: localized(lesson.title, language),
    summary: localized(lesson.summary, language),
    content: localized(lesson.content, language),
    completed: Boolean(completion),
  } })
})

app.post('/api/lessons/:lessonId/complete', async (req, res) => {
  await run(supabase.from('lesson_completions').upsert({
    user_id: req.user.id,
    lesson_id: req.params.lessonId,
  }, { onConflict: 'user_id,lesson_id' }))
  res.json({ completed: true })
})

app.post('/api/questions/:questionId/check', async (req, res) => {
  const selected = typeof req.body.answer === 'string' ? req.body.answer : ''
  const question = await run(supabase.from('questions')
    .select('answer,explanation,options').eq('id', req.params.questionId)
    .eq('question_type', 'exercise').maybeSingle())
  if (!question) return res.status(404).json({ error: 'Practice question not found.' })
  const correct = selected === question.answer
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.body.language) ? req.body.language : 'en'
  res.json({
    correct,
    answer: question.answer,
    correctLabel: localized(question.options?.[question.answer], language),
    explanation: localized(question.explanation, language),
  })
})

app.get('/api/exams', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const exams = await run(supabase.from('exams')
    .select('id,subject_id,title,description,duration_minutes,subjects(name)')
    .eq('published', true).order('sort_order'))
  const result = await Promise.all(exams.map(async (exam) => {
    const questions = await run(supabase.from('exam_questions').select('question_id').eq('exam_id', exam.id))
    return {
      id: exam.id,
      subject_id: exam.subject_id,
      title: localized(exam.title, language),
      description: localized(exam.description, language),
      subject: localized(exam.subjects?.name, language),
      duration_minutes: exam.duration_minutes,
      question_count: questions.length,
    }
  }))
  res.json({ exams: result })
})

app.get('/api/exams/:examId', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const exam = await run(supabase.from('exams')
    .select('id,title,description,duration_minutes,exam_questions(question_id,sort_order,questions(id,topic_id,prompt,options))')
    .eq('id', req.params.examId).eq('published', true).maybeSingle())
  if (!exam) return res.status(404).json({ error: 'Exam not found.' })
  const questions = (exam.exam_questions || []).sort((a, b) => a.sort_order - b.sort_order)
    .map(({ questions: question }) => ({
      id: question.id,
      topic_id: question.topic_id,
      prompt: localized(question.prompt, language),
      options: Object.fromEntries(Object.entries(question.options || {}).map(([key, value]) => [key, localized(value, language)])),
    }))
  res.json({
    exam: { id: exam.id, title: localized(exam.title, language), description: localized(exam.description, language), duration_minutes: exam.duration_minutes },
    questions,
  })
})

app.post('/api/exams/:examId/submit', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.body.language) ? req.body.language : 'en'
  const exam = await run(supabase.from('exams').select('id,title').eq('id', req.params.examId).eq('published', true).maybeSingle())
  if (!exam) return res.status(404).json({ error: 'Exam not found.' })
  const rows = await run(supabase.from('exam_questions')
    .select('sort_order,questions(id,topic_id,prompt,options,answer,explanation,topics(title))')
    .eq('exam_id', exam.id))
  const ordered = rows.sort((a, b) => a.sort_order - b.sort_order)
  if (!ordered.length) return res.status(400).json({ error: 'This exam has no questions yet.' })
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
  const review = ordered.map(({ questions: question }) => {
    const selected = typeof answers[question.id] === 'string' ? answers[question.id] : ''
    return {
      questionId: question.id,
      topicId: question.topic_id,
      topicTitle: question.topics?.title,
      prompt: localized(question.prompt, language),
      selected,
      correctAnswer: question.answer,
      correctLabel: localized(question.options?.[question.answer], language),
      correct: selected === question.answer,
      explanation: localized(question.explanation, language),
    }
  })
  const score = review.filter((entry) => entry.correct).length
  const attempt = await run(supabase.from('exam_attempts').insert({
    user_id: req.user.id,
    exam_id: exam.id,
    score,
    total_questions: review.length,
    score_percent: Math.round(score * 100 / review.length),
    review,
  }).select('id').single())
  res.json({
    attemptId: attempt.id,
    score,
    total: review.length,
    percent: Math.round(score * 100 / review.length),
    title: localized(exam.title, language),
    review,
  })
})

app.get('/api/progress', async (req, res) => {
  const [completions, lessons, attempts] = await Promise.all([
    run(supabase.from('lesson_completions').select('lesson_id,lessons(topics(subject_id))').eq('user_id', req.user.id)),
    run(supabase.from('lessons').select('id,topics(subject_id)')),
    run(supabase.from('exam_attempts')
      .select('id,score,total_questions,score_percent,review,created_at,exams(title)')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50)),
  ])
  const subjectProgress = new Map()
  for (const lesson of lessons) {
    const subjectId = lesson.topics?.subject_id
    if (!subjectId) continue
    const current = subjectProgress.get(subjectId) || { subjectId, completed: 0, total: 0 }
    current.total += 1
    subjectProgress.set(subjectId, current)
  }
  for (const completion of completions) {
    const subjectId = completion.lessons?.topics?.subject_id
    const current = subjectProgress.get(subjectId)
    if (current) current.completed += 1
  }
  const topicStats = new Map()
  for (const attempt of attempts) {
    for (const answer of attempt.review || []) {
      const current = topicStats.get(answer.topicId) || { topicId: answer.topicId, title: answer.topicTitle, total: 0, correct: 0 }
      current.total += 1
      if (answer.correct) current.correct += 1
      topicStats.set(answer.topicId, current)
    }
  }
  const weakAreas = [...topicStats.values()]
    .filter((topic) => topic.total >= 2 && topic.correct / topic.total < 0.7)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .slice(0, 4)
    .map((topic) => ({ ...topic, title: localized(topic.title, req.query.lang || 'en') }))
  res.json({
    completedLessons: completions.length,
    subjectProgress: [...subjectProgress.values()],
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      score: attempt.score,
      total: attempt.total_questions,
      percent: attempt.score_percent,
      created_at: attempt.created_at,
      title: localized(attempt.exams?.title, req.query.lang || 'en'),
    })),
    average: attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score_percent, 0) / attempts.length) : 0,
    weakAreas,
  })
})

app.get('/api/admin/lessons', requireAdmin, async (_req, res) => {
  const lessons = await run(supabase.from('lessons').select('id,topic_id,title,summary,content,media_url,sort_order').order('created_at', { ascending: false }))
  res.json({ lessons })
})

app.post('/api/admin/lessons', requireAdmin, async (req, res) => {
  const lesson = {
    topic_id: requireText(req.body.topic_id, 'Topic'),
    title: requireTranslations(req.body.title, 'Title', 180),
    summary: requireTranslations(req.body.summary, 'Summary', 500),
    content: requireTranslations(req.body.content, 'Lesson content', 10000),
    media_url: req.body.media_url ? requireText(req.body.media_url, 'Media URL', 1000) : null,
  }
  if (lesson.media_url && !/^https?:\/\//i.test(lesson.media_url)) fail(400, 'Media URLs must start with https:// or http://.')
  res.status(201).json({ lesson: await run(supabase.from('lessons').insert(lesson).select().single()) })
})

app.put('/api/admin/lessons/:id', requireAdmin, async (req, res) => {
  const changes = {}
  if (req.body.topic_id) changes.topic_id = requireText(req.body.topic_id, 'Topic')
  if (req.body.title) changes.title = requireTranslations(req.body.title, 'Title', 180)
  if (req.body.summary) changes.summary = requireTranslations(req.body.summary, 'Summary', 500)
  if (req.body.content) changes.content = requireTranslations(req.body.content, 'Lesson content', 10000)
  if (req.body.media_url !== undefined) {
    changes.media_url = req.body.media_url ? requireText(req.body.media_url, 'Media URL', 1000) : null
    if (changes.media_url && !/^https?:\/\//i.test(changes.media_url)) fail(400, 'Media URLs must start with https:// or http://.')
  }
  const lesson = await run(supabase.from('lessons').update(changes).eq('id', req.params.id).select().maybeSingle())
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  res.json({ lesson })
})

app.delete('/api/admin/lessons/:id', requireAdmin, async (req, res) => {
  await run(supabase.from('lessons').delete().eq('id', req.params.id))
  res.status(204).end()
})

app.get('/api/admin/questions', requireAdmin, async (_req, res) => {
  const questions = await run(supabase.from('questions')
    .select('id,topic_id,question_type,prompt,options,answer,explanation,exam_questions(exam_id)')
    .order('created_at', { ascending: false }))
  res.json({ questions })
})

app.post('/api/admin/questions', requireAdmin, async (req, res) => {
  const answer = requireText(req.body.answer, 'Correct answer', 1).toUpperCase()
  if (!['A', 'B', 'C', 'D'].includes(answer)) fail(400, 'Correct answer must be A, B, C, or D.')
  if (!req.body.options || !['A', 'B', 'C', 'D'].every((key) => req.body.options[key])) fail(400, 'Provide four answer choices.')
  for (const key of ['A', 'B', 'C', 'D']) requireTranslations(req.body.options[key], `Choice ${key}`, 255)
  const type = req.body.question_type === 'exam' ? 'exam' : 'exercise'
  let examId = ''
  if (type === 'exam') {
    examId = requireText(req.body.exam_id, 'Exam')
    const exam = await run(supabase.from('exams').select('id').eq('id', examId).maybeSingle())
    if (!exam) fail(400, 'Choose an existing exam for this question.')
  }
  const question = await run(supabase.from('questions').insert({
    topic_id: requireText(req.body.topic_id, 'Topic'),
    question_type: type,
    prompt: requireTranslations(req.body.prompt, 'Question', 500),
    options: req.body.options,
    answer,
    explanation: requireTranslations(req.body.explanation, 'Explanation', 1000),
  }).select().single())
  if (examId) {
    await run(supabase.from('exam_questions').insert({ exam_id: examId, question_id: question.id, sort_order: Number(req.body.sort_order) || 0 }))
  }
  res.status(201).json({ question })
})

app.put('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  const changes = {}
  if (req.body.topic_id) changes.topic_id = requireText(req.body.topic_id, 'Topic')
  if (req.body.question_type !== undefined) {
    if (!['exercise', 'exam'].includes(req.body.question_type)) fail(400, 'Choose exercise or exam for the question type.')
    changes.question_type = req.body.question_type
  }
  if (req.body.prompt) changes.prompt = requireTranslations(req.body.prompt, 'Question', 500)
  if (req.body.options) changes.options = req.body.options
  if (changes.options) {
    for (const key of ['A', 'B', 'C', 'D']) requireTranslations(changes.options[key], `Choice ${key}`, 255)
  }
  if (req.body.explanation) changes.explanation = requireTranslations(req.body.explanation, 'Explanation', 1000)
  if (req.body.answer) {
    changes.answer = requireText(req.body.answer, 'Correct answer', 1).toUpperCase()
    if (!['A', 'B', 'C', 'D'].includes(changes.answer)) fail(400, 'Correct answer must be A, B, C, or D.')
  }
  let examId
  if (changes.question_type === 'exam') {
    examId = requireText(req.body.exam_id, 'Exam')
    const exam = await run(supabase.from('exams').select('id').eq('id', examId).maybeSingle())
    if (!exam) fail(400, 'Choose an existing exam for this question.')
  }
  const question = await run(supabase.from('questions').update(changes).eq('id', req.params.id).select().maybeSingle())
  if (!question) return res.status(404).json({ error: 'Question not found.' })
  if (changes.question_type === 'exercise') {
    await run(supabase.from('exam_questions').delete().eq('question_id', question.id))
  } else if (examId) {
    await run(supabase.from('exam_questions').delete().eq('question_id', question.id))
    await run(supabase.from('exam_questions').insert({ exam_id: examId, question_id: question.id, sort_order: Number(req.body.sort_order) || 0 }))
  }
  res.json({ question })
})

app.delete('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  await run(supabase.from('questions').delete().eq('id', req.params.id))
  res.status(204).end()
})

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500
  if (status >= 500) console.error(error)
  res.status(status).json({ error: status >= 500 ? 'The learning service encountered an error.' : error.message })
})

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Ikirezi API listening on http://localhost:${port}`)
  })
}

export default app
