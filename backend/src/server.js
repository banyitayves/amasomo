import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
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
const resourceBucket = 'learning-resources'
const resourceFileTypes = new Map([
  ['pdf', 'application/pdf'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['ppt', 'application/vnd.ms-powerpoint'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['xls', 'application/vnd.ms-excel'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['txt', 'text/plain'],
])
const resourceCategories = new Set(['notes', 'past_papers', 'exercises', 'exams'])
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

function normalizeSearchText(value) {
  return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
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

function optionalTranslations(value, label, max = 500) {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) fail(400, `${label} must include translations.`)
  return Object.fromEntries(['rw', 'en', 'sw', 'fr'].map((language) => {
    const translation = value[language] ?? ''
    if (typeof translation !== 'string' || translation.length > max) fail(400, `${label} translations must be under ${max} characters.`)
    return [language, translation.trim()]
  }))
}

function requireResourceCategory(value) {
  if (typeof value !== 'string' || !resourceCategories.has(value)) {
    fail(400, 'Choose notes, past papers, exercises, or exams.')
  }
  return value
}

function validateResourceFile(body) {
  const fileName = requireText(body.file_name, 'File name', 180)
    .replace(/[\/\\]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
  const extension = fileName.split('.').pop()?.toLowerCase()
  const expectedMime = resourceFileTypes.get(extension)
  if (!expectedMime || (body.mime_type && body.mime_type !== expectedMime)) {
    fail(400, 'Upload a PDF, Office document, image, or text file.')
  }
  const fileSize = Number(body.file_size)
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 50 * 1024 * 1024) {
    fail(400, 'Files must be no larger than 50 MB.')
  }
  return { fileName, extension, fileSize, mimeType: expectedMime }
}

function validateResourcePath(value, extension) {
  const path = requireText(value, 'Upload path', 100)
  if (!/^resources\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(path)) {
    fail(400, 'The uploaded file path is invalid.')
  }
  if (extension && !path.toLowerCase().endsWith(`.${extension}`)) {
    fail(400, 'The uploaded file type does not match its file name.')
  }
  return path
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

app.get('/api/search', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  if (query.length < 2) return res.json({ results: [] })
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  const [topics, lessons, questions] = await Promise.all([
    run(supabase.from('topics').select('id,title,description,subjects(name)').limit(500)),
    run(supabase.from('lessons').select('id,topic_id,title,summary,topics(title,subjects(name))').limit(500)),
    run(supabase.from('questions').select('id,topic_id,prompt,topics(title,subjects(name))').eq('question_type', 'exercise').limit(500)),
  ])
  const matches = (values) => terms.every((term) => normalizeSearchText(values.join(' ')).includes(term))
  const results = [
    ...topics.filter((topic) => matches([localized(topic.title, language), localized(topic.description, language), localized(topic.subjects?.name, language)]))
      .map((topic) => ({ type: 'topic', id: topic.id, title: localized(topic.title, language), subject: localized(topic.subjects?.name, language) })),
    ...lessons.filter((lesson) => matches([localized(lesson.title, language), localized(lesson.summary, language), localized(lesson.topics?.title, language), localized(lesson.topics?.subjects?.name, language)]))
      .map((lesson) => ({ type: 'lesson', id: lesson.id, title: localized(lesson.title, language), topic_id: lesson.topic_id, topic: localized(lesson.topics?.title, language), subject: localized(lesson.topics?.subjects?.name, language) })),
    ...questions.filter((question) => matches([localized(question.prompt, language), localized(question.topics?.title, language), localized(question.topics?.subjects?.name, language)]))
      .map((question) => ({ type: 'question', id: question.id, title: localized(question.prompt, language), topic_id: question.topic_id, topic: localized(question.topics?.title, language), subject: localized(question.topics?.subjects?.name, language) })),
  ]
  res.json({ results: results.slice(0, 30) })
})

app.get('/api/bookmarks', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const rows = await run(supabase.from('learning_bookmarks').select('lesson_id,question_id,created_at')
    .eq('user_id', req.user.id).order('created_at', { ascending: false }))
  const lessonIds = rows.map((row) => row.lesson_id).filter(Boolean)
  const questionIds = rows.map((row) => row.question_id).filter(Boolean)
  const [lessons, questions] = await Promise.all([
    lessonIds.length ? run(supabase.from('lessons')
      .select('id,topic_id,title,summary,topics(title,subjects(name))').in('id', lessonIds)) : [],
    questionIds.length ? run(supabase.from('questions')
      .select('id,topic_id,prompt,topics(title,subjects(name))').in('id', questionIds)) : [],
  ])
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const questionById = new Map(questions.map((question) => [question.id, question]))
  const bookmarks = rows.flatMap((row) => {
    if (row.lesson_id) {
      const lesson = lessonById.get(row.lesson_id)
      return lesson ? [{
        type: 'lesson', id: lesson.id, title: localized(lesson.title, language),
        detail: localized(lesson.summary, language), topic_id: lesson.topic_id,
        topic: localized(lesson.topics?.title, language), subject: localized(lesson.topics?.subjects?.name, language),
      }] : []
    }
    const question = questionById.get(row.question_id)
    return question ? [{
      type: 'question', id: question.id, title: localized(question.prompt, language),
      detail: '', topic_id: question.topic_id,
      topic: localized(question.topics?.title, language), subject: localized(question.topics?.subjects?.name, language),
    }] : []
  })
  res.json({ bookmarks })
})

app.post('/api/bookmarks', async (req, res) => {
  const { type, id } = req.body
  if (!['lesson', 'question'].includes(type)) fail(400, 'Choose a lesson or question to bookmark.')
  const table = type === 'lesson' ? 'lessons' : 'questions'
  const target = await run(supabase.from(table).select('id').eq('id', requireText(id, 'Item ID', 36)).maybeSingle())
  if (!target) return res.status(404).json({ error: 'The item to bookmark was not found.' })
  const row = { user_id: req.user.id, lesson_id: type === 'lesson' ? id : null, question_id: type === 'question' ? id : null }
  await run(supabase.from('learning_bookmarks').upsert(row, { onConflict: type === 'lesson' ? 'user_id,lesson_id' : 'user_id,question_id' }))
  res.status(201).json({ bookmarked: true })
})

app.delete('/api/bookmarks/:type/:id', async (req, res) => {
  if (!['lesson', 'question'].includes(req.params.type)) fail(400, 'Choose a lesson or question to remove.')
  const targetColumn = req.params.type === 'lesson' ? 'lesson_id' : 'question_id'
  await run(supabase.from('learning_bookmarks').delete()
    .eq('user_id', req.user.id).eq(targetColumn, req.params.id))
  res.status(204).end()
})

app.get('/api/questions/wrong', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const rows = await run(supabase.from('learning_question_attempts')
    .select('attempt_count,last_attempted_at,questions(id,topic_id,prompt,options,topics(title))')
    .eq('user_id', req.user.id).eq('last_correct', false).order('last_attempted_at', { ascending: false }))
  res.json({ questions: rows.filter((row) => row.questions).map((row) => ({
    ...row.questions,
    prompt: localized(row.questions.prompt, language),
    topic: localized(row.questions.topics?.title, language),
    options: Object.fromEntries(Object.entries(row.questions.options || {}).map(([key, value]) => [key, localized(value, language)])),
    attempt_count: row.attempt_count,
  })) })
})

app.post('/api/support-requests', async (req, res) => {
  const contactMethod = req.body.contact_method
  if (!['email', 'whatsapp', 'phone'].includes(contactMethod)) fail(400, 'Choose how the teacher should contact you.')
  const phone = req.body.contact_phone ? requireText(req.body.contact_phone, 'Phone number', 20) : ''
  if (contactMethod !== 'email' && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    fail(400, 'Enter a phone number with its country code, such as +250791234567.')
  }
  let subjectId = null
  if (req.body.subject_id) {
    subjectId = requireText(req.body.subject_id, 'Subject', 36)
    const subject = await run(supabase.from('subjects').select('id').eq('id', subjectId).maybeSingle())
    if (!subject) fail(400, 'Choose an existing subject.')
  }
  const message = requireText(req.body.message, 'Message', 2000)
  if (message.length < 10) fail(400, 'Write at least 10 characters so the teacher can understand your request.')
  const { count, error: countError } = await supabase.from('teacher_support_requests').select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  if (countError) {
    const failure = new Error(countError.message)
    failure.status = 400
    throw failure
  }
  if (count >= 5) fail(429, 'You have reached the daily limit for teacher requests. Please wait before sending another one.')
  const request = await run(supabase.from('teacher_support_requests').insert({
    user_id: req.user.id,
    student_email: req.user.email || '',
    student_name: req.user.user_metadata?.display_name || '',
    contact_method: contactMethod,
    contact_phone: contactMethod === 'email' ? null : phone,
    subject_id: subjectId,
    message,
  }).select('id,status,created_at').single())
  res.status(201).json({ request })
})

app.get('/api/support-requests', async (req, res) => {
  const requests = await run(supabase.from('teacher_support_requests')
    .select('id,user_id,student_email,student_name,contact_method,contact_phone,message,status,created_at,subjects(name)')
    .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50))
  res.json({ requests: requests.map((request) => ({
    ...request, subject: localized(request.subjects?.name, req.query.lang || 'en'), subjects: undefined,
  })) })
})

app.get('/api/admin/support-requests', requireAdmin, async (req, res) => {
  const requests = await run(supabase.from('teacher_support_requests')
    .select('id,user_id,student_email,student_name,contact_method,contact_phone,message,status,created_at,subjects(name)')
    .order('created_at', { ascending: false }).limit(100))
  res.json({ requests: requests.map((request) => ({
    ...request, subject: localized(request.subjects?.name, req.query.lang || 'en'), subjects: undefined,
  })) })
})

app.patch('/api/admin/support-requests/:id', requireAdmin, async (req, res) => {
  if (!['pending', 'contacted', 'resolved'].includes(req.body.status)) fail(400, 'Choose a valid request status.')
  const request = await run(supabase.from('teacher_support_requests')
    .update({ status: req.body.status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('id,status,updated_at').maybeSingle())
  if (!request) return res.status(404).json({ error: 'Teacher request not found.' })
  res.json({ request })
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
    .select('answer,explanation,options').eq('id', req.params.questionId).maybeSingle())
  if (!question) return res.status(404).json({ error: 'Question not found.' })
  const correct = selected === question.answer
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.body.language) ? req.body.language : 'en'
  await run(supabase.rpc('record_learning_question_attempt', {
    p_user_id: req.user.id, p_question_id: req.params.questionId, p_correct: correct,
  }))
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

app.get('/api/resources', async (req, res) => {
  const language = ['rw', 'en', 'sw', 'fr'].includes(req.query.lang) ? req.query.lang : 'en'
  const resources = await run(supabase.from('study_resources')
    .select('id,title,description,category,subject_id,file_name,file_size,created_at,subjects(name)')
    .eq('published', true).order('created_at', { ascending: false }))
  res.json({ resources: resources.map((resource) => ({
    id: resource.id,
    title: localized(resource.title, language),
    description: localized(resource.description, language),
    category: resource.category,
    subject_id: resource.subject_id,
    subject_name: resource.subject_id ? localized(resource.subjects?.name, language) : '',
    file_name: resource.file_name,
    file_size: resource.file_size,
    created_at: resource.created_at,
  })) })
})

app.get('/api/resources/:id/download', async (req, res) => {
  const resource = await run(supabase.from('study_resources')
    .select('object_path,file_name').eq('id', req.params.id).eq('published', true).maybeSingle())
  if (!resource) return res.status(404).json({ error: 'This resource is not available.' })
  const { data, error } = await supabase.storage.from(resourceBucket)
    .createSignedUrl(resource.object_path, 60, { download: resource.file_name })
  if (error) {
    const storageError = new Error('The resource file could not be prepared for download.')
    storageError.status = 500
    throw storageError
  }
  res.json({ url: data.signedUrl })
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
    questions: shuffle(questions).map((question) => ({ ...question, option_order: shuffle(Object.keys(question.options)) })),
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
      topicTitle: localized(question.topics?.title, language),
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
  await Promise.all(review.map((entry) => run(supabase.rpc('record_learning_question_attempt', {
    p_user_id: req.user.id, p_question_id: entry.questionId, p_correct: entry.correct,
  }))))
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

app.get('/api/admin/resources', requireAdmin, async (_req, res) => {
  const resources = await run(supabase.from('study_resources')
    .select('id,title,description,category,subject_id,file_name,file_size,mime_type,published,created_at,subjects(name)')
    .order('created_at', { ascending: false }))
  res.json({ resources: resources.map((resource) => ({
    ...resource,
    subject_name: resource.subject_id ? localized(resource.subjects?.name, 'en') : '',
    subjects: undefined,
  })) })
})

app.post('/api/admin/resources/upload-url', requireAdmin, async (req, res) => {
  const file = validateResourceFile(req.body)
  const path = `resources/${randomUUID()}.${file.extension}`
  const { data, error } = await supabase.storage.from(resourceBucket).createSignedUploadUrl(path, { upsert: false })
  if (error) {
    const storageError = new Error('Could not prepare the file upload.')
    storageError.status = 500
    throw storageError
  }
  res.json({ path: data.path, token: data.token, mime_type: file.mimeType })
})

app.delete('/api/admin/resources/upload', requireAdmin, async (req, res) => {
  const path = validateResourcePath(req.body.path)
  const { error } = await supabase.storage.from(resourceBucket).remove([path])
  if (error) {
    const storageError = new Error('The incomplete upload could not be removed.')
    storageError.status = 500
    throw storageError
  }
  res.status(204).end()
})

app.post('/api/admin/resources', requireAdmin, async (req, res) => {
  const file = validateResourceFile(req.body)
  const path = validateResourcePath(req.body.upload_path, file.extension)
  const title = requireTranslations(req.body.title, 'Title', 180)
  const description = optionalTranslations(req.body.description, 'Description', 500)
  const category = requireResourceCategory(req.body.category)
  let subjectId = null
  if (req.body.subject_id) {
    subjectId = requireText(req.body.subject_id, 'Subject', 36)
    const subject = await run(supabase.from('subjects').select('id').eq('id', subjectId).maybeSingle())
    if (!subject) fail(400, 'Choose an existing subject.')
  }
  const { error: fileError } = await supabase.storage.from(resourceBucket).createSignedUrl(path, 60)
  if (fileError) fail(400, 'Upload the selected file before saving its details.')
  const resource = await run(supabase.from('study_resources').insert({
    title,
    description,
    category,
    subject_id: subjectId,
    object_path: path,
    file_name: file.fileName,
    file_size: file.fileSize,
    mime_type: file.mimeType,
    uploaded_by: req.user.id,
  }).select('id').single())
  res.status(201).json({ resource })
})

app.put('/api/admin/resources/:id', requireAdmin, async (req, res) => {
  const title = requireTranslations(req.body.title, 'Title', 180)
  const description = optionalTranslations(req.body.description, 'Description', 500)
  const category = requireResourceCategory(req.body.category)
  let subjectId = null
  if (req.body.subject_id) {
    subjectId = requireText(req.body.subject_id, 'Subject', 36)
    const subject = await run(supabase.from('subjects').select('id').eq('id', subjectId).maybeSingle())
    if (!subject) fail(400, 'Choose an existing subject.')
  }
  const resource = await run(supabase.from('study_resources')
    .update({ title, description, category, subject_id: subjectId })
    .eq('id', req.params.id).select('id').maybeSingle())
  if (!resource) return res.status(404).json({ error: 'Resource not found.' })
  res.json({ resource })
})

app.delete('/api/admin/resources/:id', requireAdmin, async (req, res) => {
  const resource = await run(supabase.from('study_resources')
    .select('id,object_path').eq('id', req.params.id).maybeSingle())
  if (!resource) return res.status(404).json({ error: 'Resource not found.' })
  const { error: storageError } = await supabase.storage.from(resourceBucket).remove([resource.object_path])
  if (storageError) {
    const failure = new Error('The resource file could not be deleted.')
    failure.status = 500
    throw failure
  }
  await run(supabase.from('study_resources').delete().eq('id', resource.id))
  res.status(204).end()
})

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500
  if (status >= 500) console.error(error)
  res.status(status).json({ error: status >= 500 ? 'The learning service encountered an error.' : error.message })
})

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Amasomo Meza API listening on http://localhost:${port}`)
  })
}

export default app
