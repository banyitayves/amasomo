import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Atom, Award, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff,
  CircleHelp, Clock3, Compass, Download, FlaskConical, GraduationCap, Leaf, LockKeyhole, LogOut, Menu,
  MessageCircle, Phone, Play, Plus, RotateCcw, Search, Sparkles, Target, Trash2, Upload, X,
} from 'lucide-react'
import { api, configured, supabase } from './api.js'
import { examCsvTemplate, parseExamCsv } from './examCsv.js'
import { languages, t, text } from './i18n.js'
const ResourcesPage = lazy(() => import('./ResourceLibrary.jsx').then((module) => ({ default: module.ResourcesPage })))
const AdminResourcesPage = lazy(() => import('./ResourceLibrary.jsx').then((module) => ({ default: module.AdminResourcesPage })))
const AdminSupportRequests = lazy(() => import('./StudyTools.jsx').then((module) => ({ default: module.AdminSupportRequests })))
const BookmarkButton = lazy(() => import('./StudyTools.jsx').then((module) => ({ default: module.BookmarkButton })))
const BookmarksPage = lazy(() => import('./StudyTools.jsx').then((module) => ({ default: module.BookmarksPage })))
const SearchPage = lazy(() => import('./StudyTools.jsx').then((module) => ({ default: module.SearchPage })))
const SupportPage = lazy(() => import('./StudyTools.jsx').then((module) => ({ default: module.SupportPage })))

const iconMap = { calculator: Target, leaf: Leaf, atom: Atom, flask: FlaskConical, book: BookOpen }
const sections = ['home', 'subjects', 'practice', 'exams', 'resources', 'search', 'bookmarks', 'askTeacher', 'progress']
const developerPhone = '+250791756160'
const maxExamCsvSize = 512 * 1024

function IconFor({ name, className = 'h-5 w-5' }) {
  const Icon = iconMap[name] || BookOpen
  return <Icon className={className} strokeWidth={1.8} />
}

function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`} src="/amasomo-logo.jpg" alt="Amasomo Meza" width="1152" height="768" />
}

function ContentLanguageSelect({ language, onChange, uiLanguage }) {
  return <label className="content-language-select"><span>{t(uiLanguage, 'contentLanguage')}</span>
    <select value={language} onChange={(event) => onChange(event.target.value)}>
      {languages.map(({ code, label }) => <option value={code} key={code}>{label}</option>)}
    </select>
  </label>
}

function LanguageSelect({ language, onChange, compact = false }) {
  return (
    <label className={`language-select ${compact ? 'language-compact' : ''}`} aria-label={t(language, 'language')}>
      <span className="sr-only">{t(language, 'language')}</span>
      <select value={language} onChange={(event) => onChange(event.target.value)}>
        {languages.map(({ code, short, label }) => <option value={code} key={code}>{compact ? short : label}</option>)}
      </select>
      <ChevronDown aria-hidden="true" size={14} />
    </label>
  )
}

function AuthScreen({ language, onLanguage, onSession }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const copy = (key) => t(language, key)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: window.location.origin })
        if (authError) throw authError
        setMessage(copy('resetSent'))
      } else if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { display_name: form.name.trim() } },
        })
        if (authError) throw authError
        if (data.session) onSession(data.session)
        else setMessage(copy('checkEmail'))
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (authError) throw authError
        onSession(data.session)
      }
    } catch (authError) {
      setError(authError.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? copy('signIn') : mode === 'register' ? copy('signUp') : copy('forgot')
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="story-glow story-glow-one" /><div className="story-glow story-glow-two" />
        <div className="story-inner">
          <div className="brand"><BrandLogo /></div>
          <div className="story-copy">
            <span className="eyebrow eyebrow-light"><Sparkles size={14} /> {copy('welcome')}</span>
            <h1>{copy('authPrompt')}</h1>
            <p>{copy('authDetails')}</p>
            <div className="story-note"><span className="note-icon"><BookOpen size={19} /></span><span><b>{copy('learnSmall')}</b><small>{copy('curiosity')}</small></span><span className="note-arrow"><ArrowRight size={17} /></span></div>
          </div>
          <div className="story-footer">{copy('welcome')}<DeveloperContact language={language} /></div>
        </div>
      </section>
      <section className="auth-panel">
        <header className="auth-top"><span className="brand brand-mobile"><BrandLogo /></span><LanguageSelect language={language} onChange={onLanguage} /></header>
        <div className="auth-card">
          <div className="auth-mobile-greeting"><span className="eyebrow"><Sparkles size={14} /> {copy('welcome')}</span></div>
          <div className="auth-heading"><span className="auth-icon"><LockKeyhole size={21} /></span><h2>{title}</h2><p>{mode === 'login' ? copy('authDetails') : mode === 'register' ? copy('authPrompt') : copy('resetInfo')}</p></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <label className="field-label">{copy('name')}<input autoComplete="name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
            <label className="field-label">{copy('email')}<input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            {mode !== 'reset' && <label className="field-label">{copy('password')}<span className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button className="password-visibility" type="button" aria-label={copy(showPassword ? 'hidePassword' : 'showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            {message && <div className="notice notice-success" role="status">{message}</div>}
            <button type="submit" className="button button-primary button-wide" disabled={busy}>{busy ? '…' : mode === 'login' ? copy('login') : mode === 'register' ? copy('register') : copy('reset')}<ArrowRight size={16} /></button>
          </form>
          <div className="auth-links">
            {mode === 'login' && <button className="text-button" onClick={() => { setError(''); setMessage(''); setMode('reset') }}>{copy('forgot')}</button>}
            {mode === 'reset' && <button className="text-button" onClick={() => setMode('login')}>{copy('back')}</button>}
            {mode !== 'reset' && <p>{mode === 'login' ? copy('noAccount') : copy('haveAccount')} <button className="text-button" onClick={() => { setError(''); setMessage(''); setMode(mode === 'login' ? 'register' : 'login') }}>{mode === 'login' ? copy('register') : copy('login')}</button></p>}
          </div>
          <p className="auth-privacy">{copy('privateJourney')}</p>
        </div>
        <div className="auth-bottom">{copy('everywhere')}<DeveloperContact language={language} /></div>
      </section>
    </main>
  )
}

function App() {
  const [language, setLanguageState] = useState(localStorage.getItem('ikirezi-language') || 'en')
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!configured)
  const [isAdmin, setIsAdmin] = useState(false)
  const [section, setSection] = useState('home')
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState([])
  const [progress, setProgress] = useState({ completedLessons: 0, subjectProgress: [], attempts: [], weakAreas: [], average: 0 })
  const [bookmarkIds, setBookmarkIds] = useState([])
  const [activeTopic, setActiveTopic] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [practiceQuestionId, setPracticeQuestionId] = useState(null)
  const [exam, setExam] = useState(null)
  const [examResult, setExamResult] = useState(null)
  const [examAnswers, setExamAnswers] = useState({})
  const [examSubmitting, setExamSubmitting] = useState(false)
  const [examIndex, setExamIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [topicData, setTopicData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')

  const setLanguage = useCallback((next) => {
    setLanguageState(next)
    localStorage.setItem('ikirezi-language', next)
  }, [])
  const user = session?.user
  const token = session?.access_token
  const submitExamRef = useRef(() => {})
  const examSubmittingRef = useRef(false)
  const copy = (key) => t(language, key)
  const loadOverview = useCallback(async (accessToken) => {
    const [subjectData, examData, progressData, bookmarkData] = await Promise.all([
      api(`/subjects?lang=${language}`, { token: accessToken }),
      api(`/exams?lang=${language}`, { token: accessToken }),
      api(`/progress?lang=${language}`, { token: accessToken }),
      api(`/bookmarks?lang=${language}`, { token: accessToken }),
    ])
    setSubjects(subjectData.subjects)
    setExams(examData.exams)
    setProgress(progressData)
    setBookmarkIds(bookmarkData.bookmarks.map((bookmark) => `${bookmark.type}:${bookmark.id}`))
  }, [language])

  useEffect(() => {
    if (!configured) return undefined
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      if (!data.session) setIsAdmin(false)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setIsAdmin(false)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([loadOverview(token), api('/auth/me', { token }).then(({ user: profile }) => setIsAdmin(profile.isAdmin))])
      .catch((requestError) => { if (active) setError(requestError.message === 'API_UNAVAILABLE' ? copy('networkError') : requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, language, loadOverview])

  useEffect(() => {
    if (!token || !activeTopic) return
    let active = true
    api(`/topics/${activeTopic.id}?lang=${language}`, { token })
      .then((data) => { if (active) setTopicData(data) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [activeTopic, language, token])

  useEffect(() => {
    if (!subjects.length) return
    if (!activeTopic) {
      setActiveTopic(subjects[0].topics?.[0] || null)
      return
    }
    const updatedTopic = subjects.flatMap((subject) => subject.topics || []).find((topic) => topic.id === activeTopic.id)
    if (updatedTopic && updatedTopic !== activeTopic) setActiveTopic(updatedTopic)
  }, [activeTopic, subjects])

  useEffect(() => {
    if (!token || !activeLesson) return
    let active = true
    api(`/lessons/${activeLesson.id}?lang=${language}`, { token })
      .then(({ lesson }) => { if (active) setActiveLesson(lesson) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  // Keep the open lesson translated without fetching it again on unrelated renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, token])

  useEffect(() => {
    if (!token || !exam || examResult) return
    let active = true
    api(`/exams/${exam.id}?lang=${language}`, { token })
      .then((data) => {
        if (!active) return
        setExam((current) => {
          if (!current || current.id !== data.exam.id) return { ...data.exam, questions: data.questions }
          const translated = new Map(data.questions.map((question) => [question.id, question]))
          return {
            ...data.exam,
            questions: current.questions.map((question) => ({
              ...(translated.get(question.id) || question),
              option_order: question.option_order,
            })),
          }
        })
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  // Language changes update question text while preserving the student's selected answers and timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, token])

  useEffect(() => {
    if (!exam || examResult) return undefined
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer)
          submitExamRef.current()
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  // submitExam is intentionally triggered only when the countdown reaches zero.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, examResult])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  async function openLesson(id) {
    try {
      const { lesson } = await api(`/lessons/${id}?lang=${language}`, { token })
      setActiveLesson(lesson)
      setSection('lesson')
      setMobileMenu(false)
    } catch (requestError) { setError(requestError.message) }
  }

  async function toggleBookmark(type, id, saved) {
    if (saved) {
      await api(`/bookmarks/${type}/${id}`, { token, method: 'DELETE' })
      setBookmarkIds((current) => current.filter((key) => key !== `${type}:${id}`))
    } else {
      await api('/bookmarks', { token, method: 'POST', body: JSON.stringify({ type, id }) })
      setBookmarkIds((current) => current.includes(`${type}:${id}`) ? current : [...current, `${type}:${id}`])
    }
  }

  function openTopic(topicId) {
    const target = subjects.flatMap((subject) => subject.topics || []).find((topic) => topic.id === topicId)
    if (!target) {
      setError(copy('topicNotFound'))
      return
    }
    setActiveTopic(target)
    setTopicData(null)
    navigate('subjects')
  }

  function openQuestion(topicId, questionId) {
    const target = subjects.flatMap((subject) => subject.topics || []).find((topic) => topic.id === topicId)
    if (!target) {
      setError(copy('topicNotFound'))
      return
    }
    setPracticeQuestionId(questionId)
    setActiveTopic(target)
    setTopicData(null)
    navigate('practice')
  }

  async function completeLesson() {
    try {
      await api(`/lessons/${activeLesson.id}/complete`, { token, method: 'POST', body: JSON.stringify({}) })
      setActiveLesson({ ...activeLesson, completed: true })
      setToast(copy('completedLabel'))
      await loadOverview(token)
    } catch (requestError) { setError(requestError.message) }
  }

  async function startExam(item) {
    try {
      const data = await api(`/exams/${item.id}?lang=${language}`, { token })
      if (!data.questions.length) {
        setError(copy('noExamQuestions'))
        return
      }
      setExam({ ...data.exam, questions: data.questions })
      setExamResult(null)
      setExamAnswers({})
      setExamSubmitting(false)
      examSubmittingRef.current = false
      setExamIndex(0)
      setSecondsLeft(data.exam.duration_minutes * 60)
      setSection('exam')
    } catch (requestError) { setError(requestError.message) }
  }

  async function submitExam() {
    if (!exam || examResult || !token || examSubmittingRef.current) return
    examSubmittingRef.current = true
    setExamSubmitting(true)
    try {
      const result = await api(`/exams/${exam.id}/submit`, {
        token, method: 'POST', body: JSON.stringify({ answers: examAnswers, language }),
      })
      setExamResult(result)
      await loadOverview(token)
    } catch (requestError) { setError(requestError.message) }
    finally {
      examSubmittingRef.current = false
      setExamSubmitting(false)
    }
  }
  submitExamRef.current = submitExam

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
    setSession(null)
    setSection('home')
  }

  function navigate(next) {
    setSection(next)
    setActiveLesson(null)
    setExam(null)
    setExamResult(null)
    setMobileMenu(false)
    setError('')
  }

  if (!configured) return <SetupScreen language={language} onLanguage={setLanguage} />
  if (!authReady) return <div className="loading-screen"><BrandLogo /><p>{copy('loading')}</p></div>
  if (!session) return <AuthScreen language={language} onLanguage={setLanguage} onSession={setSession} />

  const nav = [...sections, ...(isAdmin ? ['admin'] : [])]
  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-backdrop" aria-label={copy('closeMenu')} onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand"><BrandLogo /></div>
          <button className="sidebar-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-caption">{copy('spaceTagline')}</div>
        <nav className="sidebar-nav" aria-label={copy('mainNavigation')}>
          {nav.map((item) => {
            const Icon = item === 'home' ? Sparkles : item === 'subjects' ? GraduationCap : item === 'practice' ? CircleHelp : item === 'exams' ? Clock3 : item === 'resources' ? Download : item === 'search' ? Search : item === 'bookmarks' ? BookOpen : item === 'askTeacher' ? MessageCircle : item === 'progress' ? Award : item === 'admin' ? Plus : BookOpen
            return <button key={item} className={`nav-link ${section === item ? 'nav-active' : ''}`} onClick={() => navigate(item)}><Icon size={17} /><span>{copy(item)}</span>{section === item && <span className="nav-indicator" />}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-nudge"><span className="nudge-icon"><Sparkles size={15} /></span><b>{copy('welcome')}</b><p>{copy('subtitle')}</p></div>
          <div className="sidebar-profile"><span className="profile-avatar">{(user.user_metadata?.display_name || user.email || 'S').slice(0, 1).toUpperCase()}</span><div className="profile-copy"><b>{user.user_metadata?.display_name || user.email?.split('@')[0]}</b><span>{user.email}</span></div><button className="signout-button" title={copy('signOut')} onClick={signOut}><LogOut size={16} /><span className="signout-label">{copy('signOut')}</span></button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb"><BrandLogo className="breadcrumb-logo" /><ChevronRight size={13} /><b>{copy(section === 'lesson' || section === 'exam' ? 'subjects' : section === 'admin' ? 'admin' : section)}</b></div>
          <div className="topbar-actions"><span className="today-date">{new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span><LanguageSelect language={language} onChange={setLanguage} compact /><span className="top-avatar">{(user.user_metadata?.display_name || user.email || 'S').slice(0, 1).toUpperCase()}</span></div>
        </header>
        <div className="content-wrap">
          {error && <div className="notice notice-error top-notice" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
          {loading && <div className="inline-loading"><span className="loading-dot" /> {copy('loading')}</div>}
          <Suspense fallback={<div className="inline-loading"><span className="loading-dot" /> {copy('loading')}</div>}>
          {section === 'home' && <HomePage subjects={subjects} progress={progress} language={language} onOpenSubject={(subject) => { setActiveTopic(subject.topics?.[0] || null); navigate('subjects') }} onNavigate={navigate} />}
          {section === 'subjects' && <SubjectsPage subjects={subjects} language={language} activeTopic={activeTopic} topicData={topicData} onTopic={(topic) => { setActiveTopic(topic); setTopicData(null) }} onLesson={openLesson} onPractice={() => navigate('practice')} />}
          {section === 'lesson' && activeLesson && <LessonPage lesson={activeLesson} language={language} token={token} saved={bookmarkIds.includes(`lesson:${activeLesson.id}`)} onToggleBookmark={toggleBookmark} onBack={() => navigate('subjects')} onComplete={completeLesson} />}
          {section === 'practice' && <PracticePage subjects={subjects} topic={activeTopic || subjects[0]?.topics?.[0]} onTopic={setActiveTopic} topicData={topicData} language={language} token={token} initialQuestionId={practiceQuestionId} onQuestionOpened={() => setPracticeQuestionId(null)} bookmarkIds={bookmarkIds} onToggleBookmark={toggleBookmark} />}
          {section === 'exams' && <ExamsPage exams={exams} language={language} onStart={startExam} />}
          {section === 'exam' && exam && !examResult && <ExamPage exam={exam} answers={examAnswers} setAnswers={setExamAnswers} index={examIndex} setIndex={setExamIndex} secondsLeft={secondsLeft} onSubmit={submitExam} submitting={examSubmitting} language={language} />}
          {section === 'exam' && examResult && <ExamResult result={examResult} language={language} onAgain={() => { setExam(null); navigate('exams') }} />}
          {section === 'resources' && <ResourcesPage token={token} language={language} subjects={subjects} />}
          {section === 'search' && <SearchPage language={language} token={token} onOpenTopic={openTopic} onOpenLesson={openLesson} onOpenQuestion={openQuestion} />}
          {section === 'bookmarks' && <BookmarksPage language={language} token={token} onToggle={toggleBookmark} onOpenLesson={openLesson} onOpenQuestion={openQuestion} />}
          {section === 'askTeacher' && <SupportPage language={language} token={token} subjects={subjects} />}
          {section === 'progress' && <ProgressPage progress={progress} subjects={subjects} language={language} />}
          {section === 'admin' && isAdmin && <AdminPage subjects={subjects} exams={exams} token={token} language={language} onChanged={() => { loadOverview(token); setToast(copy('contentSaved')) }} />}
          {!['home', 'subjects', 'lesson', 'practice', 'exams', 'exam', 'resources', 'search', 'bookmarks', 'askTeacher', 'progress', 'admin'].includes(section) && <HomePage subjects={subjects} progress={progress} language={language} onOpenSubject={(subject) => { setActiveTopic(subject.topics?.[0] || null); navigate('subjects') }} onNavigate={navigate} />}
          </Suspense>
          <footer className="page-footer"><span>© {new Date().getFullYear()} {copy('footer')}</span><DeveloperContact language={language} /></footer>
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  )
}

function SetupScreen({ language, onLanguage }) {
  return <main className="setup-screen"><div className="setup-card"><div className="brand"><BrandLogo /></div><div className="setup-art"><Sparkles size={27} /></div><h1>{t(language, 'setupMissing')}</h1><p>{t(language, 'setupDetails')}</p><LanguageSelect language={language} onChange={onLanguage} /></div></main>
}

function DeveloperContact({ language }) {
  return <div className="developer-contact"><span>{t(language, 'developedBy')} <b>NSHIMIYIMANA Yves</b></span>
    <a href={`tel:${developerPhone}`}><Phone size={13} />{developerPhone}</a>
    <a href={`https://wa.me/${developerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={13} />WhatsApp</a>
  </div>
}

function HomePage({ subjects, progress, language, onOpenSubject, onNavigate }) {
  const copy = (key) => t(language, key)
  const firstName = (() => {
    const hour = new Date().getHours()
    return hour < 12 ? copy('greeting') : hour < 18 ? (language === 'fr' ? 'Bon après-midi' : language === 'sw' ? 'Habari za mchana' : language === 'rw' ? 'Mwiriwe' : 'Good afternoon') : (language === 'fr' ? 'Bonsoir' : language === 'sw' ? 'Habari za jioni' : language === 'rw' ? 'Mwiriwe neza' : 'Good evening')
  })()
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-content"><span className="eyebrow eyebrow-light"><Sparkles size={14} /> {copy('welcome')}</span><h1>{firstName} <span>✦</span></h1><p>{copy('subtitle')}</p><button className="button button-lime" onClick={() => onNavigate('subjects')}>{copy('browse')}<ArrowRight size={16} /></button></div>
        <div className="banner-art" aria-hidden="true"><div className="art-sun" /><div className="art-book art-book-one"><BookOpen size={41} /></div><div className="art-book art-book-two"><Sparkles size={21} /></div><span className="art-spark art-spark-one">✦</span><span className="art-spark art-spark-two">✳</span><div className="art-orbit" /></div>
      </section>
      <div className="section-heading"><div><span className="section-kicker">{copy('goodBeginning')}</span><h2>{copy('yourSubjects')}</h2></div><button className="text-button" onClick={() => onNavigate('subjects')}>{copy('seeAll')}<ArrowRight size={15} /></button></div>
      <div className="subject-grid">
        {subjects.map((subject, index) => <button key={subject.id} className={`subject-card subject-${subject.color || ['violet', 'emerald', 'sky'][index % 3]}`} onClick={() => onOpenSubject(subject)}>
          <span className="subject-icon"><IconFor name={subject.icon} /></span><span className="subject-meta">{subject.topics?.length || 0} {copy('topics')}</span><b>{subject.name}</b><p>{subject.description}</p><span className="card-link">{copy('start')}<ArrowRight size={15} /></span>
        </button>)}
        {!subjects.length && <div className="empty-card"><BookOpen size={23} /><p>{copy('noLessons')}</p></div>}
      </div>
      <section className="continue-card">
        <div className="continue-icon"><Target size={19} /></div><div className="continue-copy"><span className="section-kicker">{copy('progress')}</span><h3>{progress.completedLessons} {copy('completed')} · {progress.attempts.length} {copy('exams').toLowerCase()}</h3><div className="progress-track"><span style={{ width: `${Math.min(100, progress.completedLessons * 12)}%` }} /></div></div><button className="button button-secondary" onClick={() => onNavigate('progress')}>{copy('dashboard')}<ArrowRight size={15} /></button>
      </section>
    </>
  )
}

function SubjectsPage({ subjects, language, activeTopic, topicData, onTopic, onLesson, onPractice }) {
  const topicSubject = subjects.find((item) => item.topics?.some((topic) => topic.id === activeTopic?.id))
  const [selectedSubject, setSelectedSubject] = useState(topicSubject?.id || subjects[0]?.id || '')
  useEffect(() => {
    if (subjects.length && !subjects.some((subject) => subject.id === selectedSubject)) setSelectedSubject(subjects[0].id)
  }, [subjects, selectedSubject])
  useEffect(() => {
    if (topicSubject && topicSubject.id !== selectedSubject) setSelectedSubject(topicSubject.id)
  }, [selectedSubject, topicSubject])
  const subject = subjects.find((item) => item.id === selectedSubject)
  return (
    <>
      <PageHeading eyebrow={t(language, 'learningPaths')} title={t(language, 'subjects')} description={t(language, 'subtitle')} />
      <div className="subject-tabs">{subjects.map((item) => <button key={item.id} className={`subject-tab ${item.id === selectedSubject ? 'selected' : ''}`} onClick={() => { setSelectedSubject(item.id); onTopic(item.topics?.[0] || null) }}><IconFor name={item.icon} />{item.name}</button>)}</div>
      {subject && <div className="subject-detail-head"><div className={`large-subject-icon subject-${subject.color}`}><IconFor name={subject.icon} /></div><div><h2>{subject.name}</h2><p>{subject.description}</p></div></div>}
      <div className="topic-layout">
        <aside className="topic-list"><span className="section-kicker">{t(language, 'topics')}</span>{subject?.topics?.map((topic) => <button key={topic.id} onClick={() => onTopic(topic)} className={`topic-link ${activeTopic?.id === topic.id ? 'topic-selected' : ''}`}><span><b>{topic.title}</b><small>{topic.description}</small></span><ChevronRight size={16} /></button>)}</aside>
        <section className="topic-content">
          {!activeTopic && <div className="empty-card"><Compass size={23} /><p>{t(language, 'noLessons')}</p></div>}
          {activeTopic && <><div className="topic-title"><div><span className="section-kicker">{subject?.name}</span><h2>{activeTopic.title}</h2><p>{activeTopic.description}</p></div><button className="button button-outline" onClick={onPractice}><Target size={15} />{t(language, 'practice')}</button></div>
            {!topicData ? <div className="inline-loading"><span className="loading-dot" />{t(language, 'loading')}</div> : <div className="lesson-list">
              {topicData.lessons.map((lesson, index) => <button key={lesson.id} className="lesson-row" onClick={() => onLesson(lesson.id)}><span className="lesson-number">{String(index + 1).padStart(2, '0')}</span><span className="lesson-row-copy"><b>{lesson.title}</b><small>{lesson.summary}</small></span><span className="lesson-read">{t(language, 'open')}</span><span className="lesson-arrow"><ArrowRight size={16} /></span></button>)}
              {!topicData.lessons.length && <div className="empty-card"><BookOpen size={23} /><p>{t(language, 'noLessons')}</p></div>}
            </div>}
          </>}
        </section>
      </div>
    </>
  )
}

function LessonPage({ lesson, language, token, saved, onToggleBookmark, onBack, onComplete }) {
  const isImage = /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(lesson.media_url || '')
  return <section className="lesson-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} />{t(language, 'back')}</button><div className="lesson-cover"><span className="lesson-cover-icon"><BookOpen size={23} /></span><span className="section-kicker">{t(language, 'subjects')}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div><article className="lesson-article"><div className="lesson-article-actions"><BookmarkButton type="lesson" id={lesson.id} saved={saved} token={token} language={language} onToggle={onToggleBookmark} /></div><div className="lesson-article-content">{lesson.content?.split('\n').map((paragraph, index) => paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />)}</div>{isImage && <img className="lesson-image" src={lesson.media_url} alt={lesson.title} loading="lazy" />}{lesson.media_url && !isImage && <a className="video-link" href={lesson.media_url} target="_blank" rel="noreferrer"><Play size={16} />{t(language, 'video')}<ArrowRight size={15} /></a>}<button className={`button ${lesson.completed ? 'button-completed' : 'button-primary'}`} disabled={lesson.completed} onClick={onComplete}>{lesson.completed ? <Check size={16} /> : <CheckCircle2 size={16} />}{lesson.completed ? t(language, 'completedLabel') : t(language, 'markComplete')}</button></article></section>
}

function PracticePage({ subjects, topic, onTopic, topicData, language, token, initialQuestionId, onQuestionOpened, bookmarkIds, onToggleBookmark }) {
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [retryWrong, setRetryWrong] = useState(false)
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [wrongLoaded, setWrongLoaded] = useState(false)
  const [wrongLoading, setWrongLoading] = useState(false)
  const [wrongError, setWrongError] = useState('')
  const topics = subjects.flatMap((subject) => subject.topics || [])
  const currentTopic = topics.find((item) => item.id === topic?.id) || topics[0]
  const topicQuestions = topicData?.topic?.id === currentTopic?.id ? topicData.exercises : []
  const questions = retryWrong ? wrongQuestions : topicQuestions
  useEffect(() => { setIndex(0); setChoice(''); setResult(null) }, [currentTopic?.id, retryWrong, questions.length])
  useEffect(() => {
    if (!initialQuestionId || retryWrong || !topicQuestions.length) return
    const targetIndex = topicQuestions.findIndex((item) => item.id === initialQuestionId)
    if (targetIndex >= 0) {
      setIndex(targetIndex)
      onQuestionOpened()
    }
  }, [initialQuestionId, onQuestionOpened, retryWrong, topicQuestions])
  const question = questions[index]

  async function toggleRetry() {
    setWrongError('')
    if (retryWrong) {
      setRetryWrong(false)
      return
    }
    if (!wrongLoaded) {
      setWrongLoading(true)
      try {
        const data = await api(`/questions/wrong?lang=${language}`, { token })
        setWrongQuestions(data.questions)
        setWrongLoaded(true)
      } catch (requestError) {
        setWrongError(requestError.message)
        setWrongLoading(false)
        return
      }
      setWrongLoading(false)
    }
    setRetryWrong(true)
  }

  async function check() {
    if (!choice || !question) return
    setBusy(true)
    try {
      const answer = await api(`/questions/${question.id}/check`, { token, method: 'POST', body: JSON.stringify({ answer: choice, language }) })
      setResult(answer)
      if (!retryWrong) setWrongLoaded(false)
    } catch (error) { setResult({ error: error.message }) }
    finally { setBusy(false) }
  }

  function nextQuestion() {
    if (retryWrong && result?.correct) {
      setWrongQuestions((current) => current.filter((item) => item.id !== question.id))
      setIndex(0)
    } else {
      setIndex((current) => (current + 1) % questions.length)
    }
    setChoice('')
    setResult(null)
  }

  return <><PageHeading eyebrow={t(language, 'practiceMoment')} title={t(language, 'practiceTitle')} description={t(language, 'chooseAnswer')} />
    <div className="practice-wrap">
      <div className="practice-tools-row">
        {!retryWrong && <div className="practice-topic-picker"><span>{t(language, 'selectTopic')}</span><select value={currentTopic?.id || ''} onChange={(event) => { const selected = topics.find((item) => item.id === event.target.value); if (selected) onTopic(selected) }}><option value="" disabled>{t(language, 'selectTopic')}</option>{topics.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></div>}
        <button className={`button ${retryWrong ? 'button-completed' : 'button-outline'}`} onClick={toggleRetry} disabled={wrongLoading}>{wrongLoading ? t(language, 'loading') : <><RotateCcw size={15} />{t(language, retryWrong ? 'allPractice' : 'retryWrong')}</>}</button>
      </div>
      {wrongError && <div className="notice notice-error" role="alert">{wrongError}</div>}
      {!question ? <div className="empty-card practice-empty"><CircleHelp size={25} /><h3>{retryWrong ? t(language, 'noWrongAnswers') : t(language, 'noQuestions')}</h3></div> : <div className="question-card"><div className="question-card-top"><span className="question-chip">{t(language, 'question')} {index + 1} {t(language, 'of')} {questions.length}</span><span className="section-kicker">{retryWrong ? question.topic : currentTopic?.title}</span><BookmarkButton type="question" id={question.id} saved={bookmarkIds.includes(`question:${question.id}`)} token={token} language={language} onToggle={onToggleBookmark} /></div><h2>{question.prompt}</h2><div className="answer-options">{Object.entries(question.options).map(([key, value]) => <button key={key} disabled={Boolean(result)} className={`answer-option ${choice === key ? 'answer-selected' : ''} ${result && key === result.answer ? 'answer-correct' : ''} ${result && choice === key && !result.correct ? 'answer-wrong' : ''}`} onClick={() => setChoice(key)}><span className="choice-letter">{key}</span><span>{value}</span>{result && key === result.answer && <Check size={17} />}</button>)}</div>
        {result && <div className={`answer-feedback ${result.correct ? 'feedback-correct' : 'feedback-wrong'}`}><b>{result.error || (result.correct ? t(language, 'correct') : t(language, 'incorrect'))}</b>{result.error ? null : <p>{result.explanation}</p>}</div>}
        <div className="question-footer">{result ? <button className="button button-primary" onClick={nextQuestion}>{t(language, 'next')}<ArrowRight size={16} /></button> : <button className="button button-primary" disabled={!choice || busy} onClick={check}>{busy ? '…' : t(language, 'check')}<Check size={15} /></button>}</div>
      </div>}
    </div>
  </>
}

function ExamsPage({ exams, language, onStart }) {
  return <><PageHeading eyebrow={t(language, 'littleChallenge')} title={t(language, 'examTitle')} description={t(language, 'examHint')} /><div className="exam-grid">{exams.map((exam, index) => <article className={`exam-card exam-card-${index % 3}`} key={exam.id}><div className="exam-card-top"><span className="exam-icon"><Clock3 size={20} /></span><span className="exam-duration"><Clock3 size={13} />{exam.duration_minutes} {t(language, 'minutesShort')}</span></div><span className="section-kicker">{exam.subject}</span><h2>{exam.title}</h2><p>{exam.description}</p><div className="exam-meta"><span><CircleHelp size={14} />{exam.question_count} {t(language, 'question').toLowerCase()}</span><span><Target size={14} />{t(language, 'practice')}</span></div><button className="button button-primary" onClick={() => onStart(exam)}>{t(language, 'beginExam')}<ArrowRight size={16} /></button></article>)}{!exams.length && <div className="empty-card"><Clock3 size={23} /><p>{t(language, 'noResults')}</p></div>}</div></>
}

function ExamPage({ exam, answers, setAnswers, index, setIndex, secondsLeft, onSubmit, submitting, language }) {
  const question = exam.questions[index]
  const time = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  return <section className="exam-taking"><div className="exam-taking-head"><div><span className="section-kicker">{exam.title}</span><h1>{t(language, 'question')} {index + 1} <span>{t(language, 'of')} {exam.questions.length}</span></h1></div><div className={`timer-pill ${secondsLeft < 60 ? 'timer-warning' : ''}`}><Clock3 size={17} /><span>{t(language, 'timeLeft')}</span><b>{time}</b></div></div><div className="exam-progress-track"><span style={{ width: `${((index + 1) / exam.questions.length) * 100}%` }} /></div><article className="question-card exam-question-card"><div className="question-card-top"><span className="question-chip">{index + 1}/{exam.questions.length}</span><span className="section-kicker">{exam.description}</span></div><h2>{question.prompt}</h2><div className="answer-options">{(question.option_order || Object.keys(question.options)).map((key) => <button key={key} className={`answer-option ${answers[question.id] === key ? 'answer-selected' : ''}`} onClick={() => setAnswers({ ...answers, [question.id]: key })}><span className="choice-letter">{key}</span><span>{question.options[key]}</span></button>)}</div></article><div className="exam-controls"><button className="button button-outline" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={15} />{t(language, 'previous')}</button><span>{Object.keys(answers).length}/{exam.questions.length} {t(language, 'answered')}</span>{index < exam.questions.length - 1 ? <button className="button button-primary" onClick={() => setIndex(index + 1)}>{t(language, 'next')}<ArrowRight size={15} /></button> : <button className="button button-primary" disabled={submitting} onClick={onSubmit}>{submitting ? '…' : t(language, 'submitExam')}<Check size={15} /></button>}</div></section>
}

function ExamResult({ result, language, onAgain }) {
  return <section className="result-page"><div className="result-hero"><span className="result-medal"><Award size={28} /></span><span className="section-kicker">{t(language, 'examComplete')}</span><h1>{result.percent}%</h1><p>{result.score} / {result.total} · {result.title}</p><div className="result-track"><span style={{ width: `${result.percent}%` }} /></div><button className="button button-primary" onClick={onAgain}><RotateCcw size={15} />{t(language, 'tryAgain')}</button></div><div className="review-section"><div className="section-heading"><div><span className="section-kicker">{t(language, 'reviewAnswers')}</span><h2>{t(language, 'reviewAnswers')}</h2></div></div><div className="review-list">{result.review.map((answer, index) => <article className={`review-card ${answer.correct ? 'review-right' : 'review-missed'}`} key={answer.questionId}><span className="review-check">{answer.correct ? <Check size={16} /> : <X size={16} />}</span>  <div><span className="section-kicker">{t(language, 'question')} {index + 1} · {answer.topicTitle}</span><h3>{answer.prompt}</h3><p><b>{t(language, 'correctAnswer')} ({answer.correctAnswer}):</b> {answer.correctLabel}</p>{answer.selected && !answer.correct && <p><b>{t(language, 'yourAnswer')}:</b> {answer.selected}</p>}<p>{answer.explanation}</p></div></article>)}</div></div></section>
}

function ProgressPage({ progress, subjects, language }) {
  const cards = [
    { icon: BookOpen, value: progress.completedLessons, label: t(language, 'completedLessons'), color: 'progress-green' },
    { icon: Target, value: `${progress.average}%`, label: t(language, 'examAverage'), color: 'progress-violet' },
    { icon: Award, value: progress.attempts.length, label: t(language, 'exams'), color: 'progress-amber' },
  ]
  return <><PageHeading eyebrow={t(language, 'progressEyebrow')} title={t(language, 'dashboard')} description={t(language, 'welcome')} /><div className="stat-grid">{cards.map(({ icon: Icon, value, label, color }) => <article className="stat-card" key={label}><span className={`stat-icon ${color}`}><Icon size={19} /></span><strong>{value}</strong><span>{label}</span></article>)}</div><div className="progress-columns"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">{t(language, 'subjects')}</span><h2>{t(language, 'completedLessons')}</h2></div><span className="panel-count">{progress.completedLessons}</span></div><div className="subject-progress-list">{subjects.map((subject) => { const stats = progress.subjectProgress?.find((item) => item.subjectId === subject.id) || { completed: 0, total: 0 }; return <div key={subject.id} className="subject-progress"><span className={`mini-subject subject-${subject.color}`}><IconFor name={subject.icon} className="h-4 w-4" /></span><div className="subject-progress-info"><b>{subject.name}</b><div className="progress-track"><span style={{ width: `${stats.total ? Math.round(stats.completed / stats.total * 100) : 0}%` }} /></div></div><small>{stats.completed}/{stats.total}</small></div> })}</div></section><section className="panel"><div className="panel-heading"><div><span className="section-kicker">{t(language, 'weakAreas')}</span><h2>{t(language, 'weakAreas')}</h2></div><span className="panel-count"><Sparkles size={16} /></span></div><p className="panel-hint">{t(language, 'weakHint')}</p>{progress.weakAreas?.length ? progress.weakAreas.map((area) => <div className="weak-area" key={area.topicId}><span>{area.title}</span><div className="progress-track"><span style={{ width: `${Math.round(area.correct / area.total * 100)}%` }} /></div><small>{Math.round(area.correct / area.total * 100)}%</small></div>) : <div className="empty-message">{t(language, 'noResults')}</div>}</section></div><section className="panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">{t(language, 'journey')}</span><h2>{t(language, 'recentResults')}</h2></div></div>{progress.attempts.length ? progress.attempts.slice(0, 8).map((attempt) => <div className="attempt-row" key={attempt.id}><span className="attempt-icon"><CheckCircle2 size={17} /></span><span className="attempt-name"><b>{attempt.title}</b><small>{new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(attempt.created_at))}</small></span><span className="attempt-score">{attempt.percent}%</span><span className="attempt-fraction">{attempt.score}/{attempt.total}</span></div>) : <div className="empty-message">{t(language, 'noResults')}</div>}</section></>
}

function AdminPage({ subjects, exams, token, language, onChanged }) {
  const copy = (key) => t(language, key)
  const [entryLanguage, setEntryLanguage] = useState(language)
  const [kind, setKind] = useState('support')
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [resourceUploadCategory, setResourceUploadCategory] = useState('notes')
  const [lessons, setLessons] = useState([])
  const [questions, setQuestions] = useState([])
  const [managedExams, setManagedExams] = useState([])
  const [editing, setEditing] = useState(null)
  const [editingExam, setEditingExam] = useState(null)
  const [examCsvFile, setExamCsvFile] = useState(null)
  const [examCsvInputKey, setExamCsvInputKey] = useState(0)
  const examCsvInput = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const topics = subjects.flatMap((subject) => (subject.topics || []).map((topic) => ({ ...topic, subjectName: subject.name })))
  const emptyTranslations = () => Object.fromEntries(languages.map(({ code }) => [code, '']))
  const [form, setForm] = useState(() => ({
    topic_id: '', title: emptyTranslations(), summary: emptyTranslations(), content: emptyTranslations(),
    prompt: emptyTranslations(), explanation: emptyTranslations(),
    options: Object.fromEntries(['A', 'B', 'C', 'D'].map((key) => [key, emptyTranslations()])),
    answer: 'A', question_type: 'exercise', exam_id: '',
  }))
  const [examForm, setExamForm] = useState(() => ({
    subject_id: subjects[0]?.id || '', title: emptyTranslations(), description: emptyTranslations(),
    duration_minutes: 20, published: false,
  }))
  const [importTopicId, setImportTopicId] = useState(topics[0]?.id || '')
  const examTopics = topics.filter((topic) => topic.subject_id === examForm.subject_id)
  const selectedImportTopicId = examTopics.some((topic) => topic.id === importTopicId) ? importTopicId : examTopics[0]?.id || ''

  const reload = useCallback(async () => {
    const [lessonData, questionData, examData] = await Promise.all([
      api('/admin/lessons', { token }), api('/admin/questions', { token }), api('/admin/exams', { token }),
    ])
    setLessons(lessonData.lessons)
    setQuestions(questionData.questions)
    setManagedExams(examData.exams)
  }, [token])
  useEffect(() => { reload().catch((loadError) => setError(loadError.message)) }, [reload])

  function editItem(item, type) {
    setKind(type)
    setEditing(item.id)
    if (type === 'lesson') setForm({
      topic_id: item.topic_id, title: item.title, summary: item.summary, content: item.content,
      media_url: item.media_url || '',
    })
    else setForm({
      topic_id: item.topic_id, prompt: item.prompt, explanation: item.explanation,
      options: item.options, answer: item.answer, question_type: item.question_type, exam_id: item.exam_questions?.[0]?.exam_id || '',
    })
  }

  function startNew(type) {
    setKind(type)
    setEditing(null)
    setForm({
      topic_id: topics[0]?.id || '', title: emptyTranslations(), summary: emptyTranslations(), content: emptyTranslations(),
      prompt: emptyTranslations(), explanation: emptyTranslations(),
      options: Object.fromEntries(['A', 'B', 'C', 'D'].map((key) => [key, emptyTranslations()])),
      answer: 'A', question_type: 'exercise', exam_id: managedExams.find((item) => item.published)?.id || '',
    })
  }

  function startQuestionForExam(examId) {
    startNew('question')
    const exam = managedExams.find((item) => item.id === examId)
    const examTopic = topics.find((topic) => topic.subject_id === exam?.subject_id)
    setForm((current) => ({
      ...current,
      topic_id: examTopic?.id || current.topic_id,
      question_type: 'exam',
      exam_id: examId,
    }))
  }

  function editExam(exam) {
    setKind('exams')
    setEditingExam(exam.id)
    setEditing(null)
    setExamCsvFile(null)
    setExamCsvInputKey((current) => current + 1)
    setImportTopicId(topics.find((topic) => topic.subject_id === exam.subject_id)?.id || '')
    setExamForm({
      subject_id: exam.subject_id, title: exam.title, description: exam.description,
      duration_minutes: exam.duration_minutes, published: exam.published,
    })
  }

  function startNewExam() {
    setEditingExam(null)
    setEditing(null)
    setExamCsvFile(null)
    setExamCsvInputKey((current) => current + 1)
    setExamForm({
      subject_id: subjects[0]?.id || '', title: emptyTranslations(), description: emptyTranslations(),
      duration_minutes: 20, published: false,
    })
    setImportTopicId(topics.find((topic) => topic.subject_id === subjects[0]?.id)?.id || '')
  }

  async function saveExam(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    let examId = editingExam
    let examSaved = false
    let importCompleted = false
    try {
      let importedQuestions = null
      if (examCsvFile) {
        if (examCsvFile.size > maxExamCsvSize) throw new Error(copy('examCsvMaxSize'))
        if (!selectedImportTopicId) throw new Error(copy('examCsvChooseTopic'))
        importedQuestions = parseExamCsv(await examCsvFile.text())
      }
      const { exam: savedExam } = await api(`/admin/exams${editingExam ? `/${editingExam}` : ''}`, {
        token, method: editingExam ? 'PUT' : 'POST',
        body: JSON.stringify({ ...examForm, duration_minutes: Number(examForm.duration_minutes) }),
      })
      examId = savedExam.id
      examSaved = true
      if (importedQuestions) {
        await api(`/admin/exams/${examId}/questions/import`, {
          token,
          method: 'POST',
          body: JSON.stringify({
            topic_id: selectedImportTopicId,
            language: entryLanguage,
            questions: importedQuestions.map((question) => ({
              ...question,
              prompt: { [entryLanguage]: question.prompt },
              options: Object.fromEntries(Object.entries(question.options).map(([key, value]) => [key, { [entryLanguage]: value }])),
              explanation: { [entryLanguage]: question.explanation },
            })),
          }),
        })
        importCompleted = true
      }
      startNewExam()
      if (examCsvInput.current) examCsvInput.current.value = ''
      await reload()
      onChanged()
    } catch (saveError) {
      let message = saveError.message
      if (examSaved && examCsvFile && !importCompleted) {
        setEditingExam(examId)
        message = `${copy('examCsvImportFailed')}: ${saveError.message}`
        try {
          await reload()
          onChanged()
        } catch (reloadError) {
          message += ` · ${reloadError.message}`
        }
      }
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function removeExam(exam) {
    if (!window.confirm(`${copy('delete')} “${text(exam.title, language)}”?`)) return
    setError('')
    try {
      await api(`/admin/exams/${exam.id}`, { token, method: 'DELETE' })
      if (editingExam === exam.id) startNewExam()
      await reload()
      onChanged()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function toggleExamPublished(exam) {
    setError('')
    try {
      await api(`/admin/exams/${exam.id}`, {
        token, method: 'PUT', body: JSON.stringify({ published: !exam.published }),
      })
      await reload()
      onChanged()
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  function changeTranslation(field, locale, value, option) {
    setForm((current) => option
      ? { ...current, options: { ...current.options, [option]: { ...current.options[option], [locale]: value } } }
      : { ...current, [field]: { ...current[field], [locale]: value } })
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = kind === 'lesson'
        ? { topic_id: form.topic_id, title: form.title, summary: form.summary, content: form.content, media_url: form.media_url || '' }
        : { topic_id: form.topic_id, prompt: form.prompt, explanation: form.explanation, options: form.options, answer: form.answer, question_type: form.question_type, exam_id: form.exam_id }
      const path = `/admin/${kind === 'lesson' ? 'lessons' : 'questions'}${editing ? `/${editing}` : ''}`
      await api(path, { token, method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) })
      setEditing(null)
      await reload()
      onChanged()
    } catch (saveError) { setError(saveError.message) }
    finally { setBusy(false) }
  }

  async function remove(item, type) {
    if (!window.confirm(`${copy('delete')} “${text(item.title || item.prompt, language)}”?`)) return
    try {
      await api(`/admin/${type === 'lesson' ? 'lessons' : 'questions'}/${item.id}`, { token, method: 'DELETE' })
      await reload()
      onChanged()
    } catch (deleteError) { setError(deleteError.message) }
  }

  return <>
    <PageHeading eyebrow={copy('teachingToolkit')} title={copy('adminTitle')} description={copy('learnSmall')} />
    {kind !== 'support' && <div className="content-language-settings">
      <ContentLanguageSelect language={entryLanguage} onChange={setEntryLanguage} uiLanguage={language} />
      <p>{copy('contentLanguageHint')}</p>
    </div>}
    <div className="admin-tabs">
      <button className={kind === 'lesson' ? 'selected' : ''} onClick={() => { setKind('lesson'); setEditing(null) }}><BookOpen size={16} />{copy('lessons')} ({lessons.length})</button>
      <button className={kind === 'question' ? 'selected' : ''} onClick={() => { setKind('question'); setEditing(null) }}><CircleHelp size={16} />{copy('practice')} ({questions.length})</button>
      <button className={kind === 'exams' ? 'selected' : ''} onClick={() => { setKind('exams'); setEditing(null); startNewExam() }}><Clock3 size={16} />{copy('exams')} ({managedExams.length})</button>
      <button className={kind === 'resources' ? 'selected' : ''} onClick={() => { setKind('resources'); setEditing(null); setResourceUploadCategory('notes') }}><Download size={16} />{copy('resources')}</button>
      <button className={kind === 'support' ? 'selected' : ''} aria-label={`${copy('supportInbox')}: ${pendingRequestCount} ${copy('pending')}`} onClick={() => { setKind('support'); setEditing(null) }}><MessageCircle size={16} />{copy('supportInbox')}<span className="admin-tab-count">{pendingRequestCount}</span></button>
    </div>
    {kind === 'resources' ? <><div className="exam-admin-guidance"><p>{copy('resourceWorkflow')}</p></div><AdminResourcesPage token={token} language={language} entryLanguage={entryLanguage} subjects={subjects} onChanged={onChanged} initialCategory={resourceUploadCategory} /></> : kind === 'support' ? <AdminSupportRequests token={token} language={language} onPendingCount={setPendingRequestCount} /> : kind === 'exams' ? <>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="exam-admin-guidance"><div className="exam-admin-guidance-heading"><b>{copy('examWorkflowTitle')}</b><button className="button button-outline button-small" onClick={() => { setResourceUploadCategory('exams'); setKind('resources') }}><Upload size={14} />{copy('uploadExamPaper')}</button></div><p>{copy('examWorkflow')}</p></div>
      <div className="admin-layout">
        <section className="panel admin-list">
          <div className="panel-heading"><div><span className="section-kicker">{copy('libraryEyebrow')}</span><h2>{copy('exams')}</h2></div><button className="button button-primary button-small" onClick={startNewExam}><Plus size={15} />{copy('addExam')}</button></div>
          {managedExams.map((item) => <div className="exam-admin-row" key={item.id}>
            <div className="exam-admin-copy"><b>{text(item.title, language)}</b><small>{text(item.subject, language)} · {item.duration_minutes} {copy('minutesShort')} · {item.question_count} {copy('question').toLowerCase()}</small><span className={`exam-publish-status ${item.published ? 'exam-published' : ''}`}>{copy(item.published ? 'published' : 'draft')}</span></div>
            <div className="exam-admin-actions">
              <button className="button button-outline button-small" onClick={() => startQuestionForExam(item.id)}>{copy('addExamQuestion')}</button>
              <button aria-label={copy('edit')} onClick={() => editExam(item)}><RotateCcw size={15} /></button>
              <button aria-label={copy(item.published ? 'unpublish' : 'publishExam')} disabled={!item.published && !item.question_count} onClick={() => toggleExamPublished(item)}>{item.published ? <EyeOff size={15} /> : <Check size={15} />}</button>
              <button aria-label={copy('delete')} onClick={() => removeExam(item)}><Trash2 size={15} /></button>
            </div>
          </div>)}
          {!managedExams.length && <div className="empty-message">{copy('noManagedExams')}</div>}
        </section>
        <section className="panel admin-form-panel">
          <div className="panel-heading"><div><span className="section-kicker">{copy('languageEyebrow')}</span><h2>{editingExam ? copy('editExam') : copy('addExam')}</h2></div>{editingExam && <button className="icon-quiet" onClick={startNewExam} aria-label={copy('cancel')}><X size={17} /></button>}</div>
          <form className="admin-form" onSubmit={saveExam}>
            <label className="field-label">{copy('selectSubject')}<select required value={examForm.subject_id} onChange={(event) => {
              const subjectId = event.target.value
              setExamForm({ ...examForm, subject_id: subjectId })
              setImportTopicId(topics.find((topic) => topic.subject_id === subjectId)?.id || '')
            }}><option value="" disabled>{copy('selectSubject')}</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
            <TranslationFields label={copy('examTitle')} field="title" value={examForm.title} language={entryLanguage} onChange={(field, locale, value) => setExamForm((current) => ({ ...current, [field]: { ...current[field], [locale]: value } }))} />
            <TranslationFields label={copy('examDescription')} field="description" value={examForm.description} language={entryLanguage} onChange={(field, locale, value) => setExamForm((current) => ({ ...current, [field]: { ...current[field], [locale]: value } }))} multiline />
            <label className="field-label">{copy('examDuration')}<input type="number" min="1" max="240" required value={examForm.duration_minutes} onChange={(event) => setExamForm({ ...examForm, duration_minutes: event.target.value })} /></label>
            <div className="exam-csv-import">
              <b>{copy('examCsvImportTitle')}</b>
              <p>{copy('examCsvImportHint')}</p>
              <a className="exam-csv-template" href={`data:text/csv;charset=utf-8,${encodeURIComponent(examCsvTemplate)}`} download="amasomo-exam-template.csv">{copy('examCsvDownloadTemplate')}<Download size={14} /></a>
              <label className="field-label">{copy('examCsvTopic')}<select value={selectedImportTopicId} onChange={(event) => setImportTopicId(event.target.value)} disabled={!examTopics.length} required={Boolean(examCsvFile)}><option value="">{copy('examCsvChooseTopic')}</option>{examTopics.map((topic) => <option value={topic.id} key={topic.id}>{topic.title}</option>)}</select></label>
              <label className="field-label">{copy('examCsvFile')}<input key={examCsvInputKey} ref={examCsvInput} className="resource-file-input" type="file" accept=".csv,text/csv" onChange={(event) => setExamCsvFile(event.target.files?.[0] || null)} /><small className="resource-hint">{copy('examCsvOptional')}</small></label>
            </div>
            {editingExam && <label className="exam-publish-toggle"><input type="checkbox" checked={examForm.published} onChange={(event) => setExamForm({ ...examForm, published: event.target.checked })} />{copy('publishExam')}</label>}
            {!editingExam && <p className="resource-hint">{copy('newExamDraftHint')}</p>}
            <button className="button button-primary button-wide" disabled={busy || !subjects.length}>{busy ? '…' : copy('save')}<Check size={15} /></button>
          </form>
        </section>
      </div>
    </> : <>
      {error && <div className="notice notice-error">{error}</div>}
      {kind === 'question' && <div className="exam-admin-guidance"><b>{copy('questionWorkflowTitle')}</b><p>{copy('questionWorkflow')}</p></div>}
      <div className="admin-layout">
        <section className="panel admin-list">
          <div className="panel-heading"><div><span className="section-kicker">{copy('libraryEyebrow')}</span><h2>{kind === 'lesson' ? copy('lessons') : copy('practice')}</h2></div><button className="button button-primary button-small" onClick={() => startNew(kind)}><Plus size={15} />{kind === 'lesson' ? copy('addLesson') : copy('addQuestion')}</button></div>
          {(kind === 'lesson' ? lessons : questions).map((item) => <div className="admin-row" key={item.id}><span className="admin-row-icon">{kind === 'lesson' ? <BookOpen size={16} /> : <CircleHelp size={16} />}</span><span className="admin-row-title"><b>{text(item.title || item.prompt, language)}</b><small>{topics.find((topic) => topic.id === item.topic_id)?.title || ''}</small></span><button aria-label={copy('edit')} onClick={() => editItem(item, kind)}><RotateCcw size={15} /></button><button aria-label={copy('delete')} onClick={() => remove(item, kind)}><Trash2 size={15} /></button></div>)}
          {(kind === 'lesson' ? lessons : questions).length === 0 && <div className="empty-message">{copy('noLessons')}</div>}
        </section>
        <section className="panel admin-form-panel">
          <div className="panel-heading"><div><span className="section-kicker">{copy('languageEyebrow')}</span><h2>{editing ? copy('edit') : kind === 'lesson' ? copy('addLesson') : copy('addQuestion')}</h2></div>{editing && <button className="icon-quiet" onClick={() => setEditing(null)} aria-label={copy('cancel')}><X size={17} /></button>}</div>
          <form className="admin-form" onSubmit={save}>
            <label className="field-label">{copy('selectTopic')}<select required value={form.topic_id || ''} onChange={(event) => setForm({ ...form, topic_id: event.target.value })}><option value="" disabled>{copy('selectTopic')}</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.subjectName} · {topic.title}</option>)}</select></label>
            {kind === 'lesson' ? <>
              <TranslationFields label={copy('lessonTitle')} field="title" value={form.title} language={entryLanguage} onChange={changeTranslation} />
              <TranslationFields label={copy('shortSummary')} field="summary" value={form.summary} language={entryLanguage} onChange={changeTranslation} />
              <TranslationFields label={copy('lessonNotes')} field="content" value={form.content} language={entryLanguage} onChange={changeTranslation} multiline />
              <label className="field-label">{copy('mediaLink')}<input type="url" value={form.media_url || ''} onChange={(event) => setForm({ ...form, media_url: event.target.value })} placeholder="https://" /></label>
            </> : <>
              <TranslationFields label={copy('questionPrompt')} field="prompt" value={form.prompt} language={entryLanguage} onChange={changeTranslation} />
              {['A', 'B', 'C', 'D'].map((option) => <TranslationFields key={option} label={`${copy('choice')} ${option}`} field="options" option={option} value={form.options?.[option] || emptyTranslations()} language={entryLanguage} onChange={changeTranslation} />)}
              <label className="field-label">{copy('correctAnswer')}<select value={form.answer || 'A'} onChange={(event) => setForm({ ...form, answer: event.target.value })}>{['A', 'B', 'C', 'D'].map((answer) => <option key={answer}>{answer}</option>)}</select></label>
              <TranslationFields label={copy('explanation')} field="explanation" value={form.explanation} language={entryLanguage} onChange={changeTranslation} multiline />
              <label className="field-label">{copy('questionType')}<select value={form.question_type || 'exercise'} onChange={(event) => setForm({ ...form, question_type: event.target.value })}><option value="exercise">{copy('practice')}</option><option value="exam">{copy('exams')}</option></select></label>
              {form.question_type === 'exam' && <label className="field-label">{copy('exams')}<select required value={form.exam_id || ''} onChange={(event) => setForm({ ...form, exam_id: event.target.value })}><option value="" disabled>{copy('selectExam')}</option>{managedExams.map((item) => <option value={item.id} key={item.id}>{text(item.title, language)}{!item.published ? ` · ${copy('draft')}` : ''}</option>)}</select></label>}
            </>}
            <button className="button button-primary button-wide" disabled={busy || !topics.length}>{busy ? '…' : copy('save')}<Check size={15} /></button>
          </form>
        </section>
      </div>
    </>}
  </>
}

function TranslationFields({ label, field, option, value, language, onChange, multiline = false }) {
  const selectedLanguage = languages.find((item) => item.code === language) || languages[0]
  return <fieldset className="translation-group"><legend>{label}</legend><div className="translation-fields"><label className="translation-label"><span>{selectedLanguage.short}</span>{multiline ? <textarea required value={value?.[language] || ''} rows={language === 'en' ? 3 : 2} onChange={(event) => onChange(field, language, event.target.value, option)} /> : <input required value={value?.[language] || ''} onChange={(event) => onChange(field, language, event.target.value, option)} />}</label></div></fieldset>
}

function PageHeading({ eyebrow, title, description }) {
  return <div className="page-heading"><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
}

export default App
