import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Bookmark, CircleHelp, Mail, MessageCircle, Phone, RefreshCw, Search } from 'lucide-react'
import { api } from './api.js'
import { t } from './i18n.js'

export function BookmarkButton({ type, id, saved, token, language, onToggle }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      await onToggle(type, id, saved)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <span className="bookmark-action">
    <button className={`bookmark-button ${saved ? 'is-bookmarked' : ''}`} type="button" disabled={busy || !token}
      aria-label={t(language, saved ? 'removeBookmark' : 'addBookmark')} title={t(language, saved ? 'removeBookmark' : 'addBookmark')}
      onClick={toggle}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved && <span>{t(language, 'saved')}</span>}</button>
    {error && <span className="bookmark-error" role="alert">{error}</span>}
  </span>
}

export function SearchPage({ language, token, onOpenTopic, onOpenLesson, onOpenQuestion }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setError('')
      setBusy(false)
      return undefined
    }
    let active = true
    const timer = window.setTimeout(async () => {
      setBusy(true)
      setError('')
      try {
        const data = await api(`/search?lang=${language}&q=${encodeURIComponent(term)}`, { token })
        if (active) setResults(data.results)
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setBusy(false)
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [language, query, token])

  function open(result) {
    if (result.type === 'lesson') onOpenLesson(result.id)
    else if (result.type === 'question') onOpenQuestion(result.topic_id, result.id)
    else onOpenTopic(result.id)
  }

  return <>
    <PageHeading language={language} eyebrow="searchEyebrow" title="search" description="searchHint" />
    <label className="search-field"><Search size={19} /><span className="sr-only">{t(language, 'search')}</span>
      <input type="search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder={t(language, 'searchPlaceholder')} />
      {busy && <span className="search-loading" aria-label={t(language, 'loading')} />}
    </label>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {query.trim().length >= 2 && !busy && !error && !results.length && <div className="empty-card"><Search size={23} /><p>{t(language, 'searchNoResults')}</p></div>}
    <div className="tool-list">{results.map((result) => <button className="tool-result" key={`${result.type}-${result.id}`} onClick={() => open(result)}>
      <span className="tool-result-icon">{result.type === 'lesson' ? <BookOpen size={17} /> : result.type === 'question' ? <CircleHelp size={17} /> : <Search size={17} />}</span>
      <span className="tool-result-copy"><small>{t(language, result.type)}{result.subject ? ` · ${result.subject}` : ''}{result.topic ? ` · ${result.topic}` : ''}</small><b>{result.title}</b></span>
      <ArrowRight size={16} />
    </button>)}</div>
  </>
}

export function BookmarksPage({ language, token, onToggle, onOpenLesson, onOpenQuestion }) {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    api(`/bookmarks?lang=${language}`, { token })
      .then(({ bookmarks: saved }) => { if (active) setBookmarks(saved) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [language, token])

  async function remove(type, id) {
    await onToggle(type, id, true)
    setBookmarks((current) => current.filter((bookmark) => bookmark.type !== type || bookmark.id !== id))
  }

  return <>
    <PageHeading language={language} eyebrow="savedEyebrow" title="bookmarks" description="bookmarksHint" />
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading && <div className="inline-loading">{t(language, 'loading')}</div>}
    {!loading && !error && !bookmarks.length && <div className="empty-card"><Bookmark size={23} /><p>{t(language, 'noBookmarks')}</p></div>}
    <div className="tool-list">{bookmarks.map((bookmark) => <article className="saved-item" key={`${bookmark.type}-${bookmark.id}`}>
      <button className="tool-result saved-item-open" onClick={() => bookmark.type === 'lesson' ? onOpenLesson(bookmark.id) : onOpenQuestion(bookmark.topic_id, bookmark.id)}>
        <span className="tool-result-icon">{bookmark.type === 'lesson' ? <BookOpen size={17} /> : <CircleHelp size={17} />}</span>
        <span className="tool-result-copy"><small>{t(language, bookmark.type)}{bookmark.subject ? ` · ${bookmark.subject}` : ''}{bookmark.topic ? ` · ${bookmark.topic}` : ''}</small><b>{bookmark.title}</b>{bookmark.detail && <span>{bookmark.detail}</span>}</span>
        <ArrowRight size={16} />
      </button>
      <BookmarkButton type={bookmark.type} id={bookmark.id} saved token={token} language={language} onToggle={remove} />
    </article>)}</div>
  </>
}

export function SupportPage({ language, token, subjects }) {
  const [form, setForm] = useState({ subject_id: '', contact_method: 'email', contact_phone: '', message: '' })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let active = true
    api(`/support-requests?lang=${language}`, { token })
      .then(({ requests: saved }) => { if (active) setRequests(saved) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [language, token])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSent(false)
    try {
      const { request } = await api('/support-requests', {
        token, method: 'POST', body: JSON.stringify(form),
      })
      setRequests((current) => [{ ...request, subject: subjects.find((item) => item.id === form.subject_id)?.name || '' }, ...current])
      setForm({ subject_id: '', contact_method: 'email', contact_phone: '', message: '' })
      setSent(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <PageHeading language={language} eyebrow="teacherEyebrow" title="askTeacher" description="teacherHint" />
    <section className="panel support-panel">
      <form className="support-form" onSubmit={submit}>
        <label className="field-label">{t(language, 'selectSubject')}<select value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })}><option value="">{t(language, 'resourceAllSubjects')}</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
        <label className="field-label">{t(language, 'contactMethod')}<select value={form.contact_method} onChange={(event) => setForm({ ...form, contact_method: event.target.value })}>
          <option value="email">{t(language, 'email')}</option><option value="whatsapp">WhatsApp</option><option value="phone">{t(language, 'phone')}</option>
        </select></label>
        {form.contact_method !== 'email' && <label className="field-label">{t(language, 'contactPhone')}<input type="tel" required pattern="\+[1-9][0-9]{7,14}" maxLength={16} placeholder="+250791234567" value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} /></label>}
        <label className="field-label">{t(language, 'message')}<textarea required minLength={10} maxLength={2000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={t(language, 'teacherMessagePlaceholder')} /></label>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {sent && <div className="notice notice-success" role="status">{t(language, 'teacherRequestSent')}</div>}
        <button className="button button-primary" disabled={busy}>{busy ? t(language, 'loading') : <><MessageCircle size={16} />{t(language, 'sendRequest')}</>}</button>
      </form>
    </section>
    <div className="section-heading support-history-heading"><div><span className="section-kicker">{t(language, 'teacherEyebrow')}</span><h2>{t(language, 'yourRequests')}</h2></div></div>
    {loading && <div className="inline-loading">{t(language, 'loading')}</div>}
    {!loading && !requests.length && <div className="empty-card"><MessageCircle size={22} /><p>{t(language, 'noTeacherRequests')}</p></div>}
    <div className="tool-list">{requests.map((request) => <article className="request-card" key={request.id}>
      <div><small>{request.subject || t(language, 'resourceAllSubjects')} · {new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(request.created_at))}</small><p>{request.message}</p></div>
      <span className={`request-status status-${request.status}`}>{t(language, request.status)}</span>
    </article>)}</div>
  </>
}

export function AdminSupportRequests({ language, token, onPendingCount }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let active = true
    setError('')
    setRefreshing(true)
    api(`/admin/support-requests?lang=${language}`, { token })
      .then(({ requests: items }) => {
        if (!active) return
        setRequests(items)
        onPendingCount(items.filter((request) => request.status === 'pending').length)
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })
    return () => { active = false }
  }, [language, onPendingCount, refreshKey, token])

  async function updateStatus(id, status) {
    setUpdating(id)
    setError('')
    try {
      await api(`/admin/support-requests/${id}`, { token, method: 'PATCH', body: JSON.stringify({ status }) })
      setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request))
      onPendingCount(requests.filter((request) => request.id !== id && request.status === 'pending').length + (status === 'pending' ? 1 : 0))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdating('')
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length
  return <section className="tool-list admin-requests">
    <div className="admin-requests-header">
      <div><span className="section-kicker">{t(language, 'supportInbox')}</span><h2>{t(language, 'supportPendingCount')}: {pendingCount}</h2></div>
      <button className="button button-outline button-small" type="button" disabled={refreshing} onClick={() => setRefreshKey((current) => current + 1)}><RefreshCw size={14} className={refreshing ? 'resource-spinner' : ''} />{t(language, 'refresh')}</button>
    </div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading && <div className="inline-loading">{t(language, 'loading')}</div>}
    {!loading && !requests.length && <div className="empty-card"><MessageCircle size={22} /><p>{t(language, 'noTeacherRequests')}</p></div>}
    {requests.map((request) => <article className="request-card admin-request-card" key={request.id}>
      <div className="admin-request-main"><div className="request-card-heading"><b>{request.student_name || request.student_email}</b><small>{request.subject || t(language, 'resourceAllSubjects')} · {new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(request.created_at))}</small></div>
        <p>{request.message}</p><div className="request-contact">
          {request.student_email && <a href={`mailto:${encodeURIComponent(request.student_email)}`}><Mail size={14} />{request.student_email}</a>}
          {request.contact_phone && request.contact_method === 'whatsapp' && <a href={`https://wa.me/${request.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp · {request.contact_phone}</a>}
          {request.contact_phone && request.contact_method === 'phone' && <a href={`tel:${request.contact_phone}`}><Phone size={14} />{request.contact_phone}</a>}
        </div>
      </div>
      <label className="status-select"><span className="sr-only">{t(language, 'requestStatus')}</span><select disabled={updating === request.id} value={request.status} onChange={(event) => updateStatus(request.id, event.target.value)}>
        {['pending', 'contacted', 'resolved'].map((status) => <option value={status} key={status}>{t(language, status)}</option>)}
      </select></label>
    </article>)}
  </section>
}

function PageHeading({ language, eyebrow, title, description }) {
  return <div className="page-heading"><span className="section-kicker">{t(language, eyebrow)}</span><h1>{t(language, title)}</h1><p>{t(language, description)}</p></div>
}
