import { useCallback, useEffect, useState } from 'react'
import { Download, FileText, LoaderCircle, Pencil, Trash2, Upload, X } from 'lucide-react'
import { api, supabase } from './api.js'
import { languages, t, text } from './i18n.js'

const categories = ['notes', 'past_papers', 'exercises', 'exams']
const maxFileSize = 50 * 1024 * 1024
const acceptedFiles = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt'

function formatSize(bytes, language) {
  return new Intl.NumberFormat(language, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })
    .format(bytes / (1024 * 1024))
}

function CategoryLabel({ category, language }) {
  return t(language, `resource${category === 'past_papers' ? 'PastPapers' : category[0].toUpperCase() + category.slice(1)}`)
}

export function ResourcesPage({ token, language, subjects }) {
  const [resources, setResources] = useState([])
  const [category, setCategory] = useState('all')
  const [subject, setSubject] = useState('all')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api(`/resources?lang=${language}`, { token })
      .then(({ resources: items }) => { if (active) setResources(items) })
      .catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [language, token])

  async function download(resource) {
    setDownloading(resource.id)
    setError('')
    try {
      const { url } = await api(`/resources/${resource.id}/download`, { token })
      window.location.assign(url)
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloading('')
    }
  }

  const visibleResources = resources.filter((resource) =>
    (category === 'all' || resource.category === category)
    && (subject === 'all' || resource.subject_id === subject))

  return <>
    <div className="page-heading"><span className="section-kicker">{t(language, 'resourceEyebrow')}</span><h1>{t(language, 'resources')}</h1><p>{t(language, 'resourcesSubtitle')}</p></div>
    <div className="resource-filters">
      <label className="field-label">{t(language, 'resourceCategory')}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t(language, 'resourceAll')}</option>{categories.map((item) => <option key={item} value={item}><CategoryLabel category={item} language={language} /></option>)}</select></label>
      <label className="field-label">{t(language, 'resourceSubject')}<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">{t(language, 'resourceAllSubjects')}</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    </div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading ? <div className="empty-card"><LoaderCircle size={22} className="resource-spinner" /><p>{t(language, 'resourceLoading')}</p></div>
      : visibleResources.length ? <div className="resource-grid">{visibleResources.map((resource) => <article className="resource-card" key={resource.id}>
        <div className="resource-card-top"><span className="resource-icon"><FileText size={19} /></span><span className="resource-category"><CategoryLabel category={resource.category} language={language} /></span></div>
        <h2>{text(resource.title, language)}</h2>
        {text(resource.description, language) && <p>{text(resource.description, language)}</p>}
        <div className="resource-card-meta"><span>{resource.subject_name || t(language, 'resourceAllSubjects')}</span><span>{formatSize(resource.file_size, language)}</span></div>
        <button className="button button-primary button-wide" disabled={downloading === resource.id} onClick={() => download(resource)}>{downloading === resource.id ? '…' : t(language, 'resourceDownload')}<Download size={15} /></button>
      </article>)}</div>
        : <div className="empty-card"><FileText size={23} /><p>{t(language, 'resourceNoFiles')}</p></div>}
  </>
}

function emptyTranslations() {
  return Object.fromEntries(languages.map(({ code }) => [code, '']))
}

function ResourceTranslations({ label, value, onChange, multiline = false, required = false }) {
  return <fieldset className="translation-group"><legend>{label}</legend><div className="translation-fields">{languages.map(({ code, short }) => <label className="translation-label" key={code}><span>{short}</span>{multiline
    ? <textarea value={value[code] || ''} rows={2} maxLength={500} required={required} onChange={(event) => onChange(code, event.target.value)} />
    : <input value={value[code] || ''} maxLength={180} required={required} onChange={(event) => onChange(code, event.target.value)} />}</label>)}</div></fieldset>
}

export function AdminResourcesPage({ token, language, subjects, onChanged, initialCategory = 'notes' }) {
  const [resources, setResources] = useState([])
  const [title, setTitle] = useState(emptyTranslations)
  const [description, setDescription] = useState(emptyTranslations)
  const [category, setCategory] = useState(initialCategory)
  const [subjectId, setSubjectId] = useState('')
  const [file, setFile] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { resources: items } = await api('/admin/resources', { token })
    setResources(items)
  }, [token])

  useEffect(() => { reload().catch((loadError) => setError(loadError.message)) }, [reload])

  function resetForm() {
    setTitle(emptyTranslations())
    setDescription(emptyTranslations())
    setCategory('notes')
    setSubjectId('')
    setFile(null)
    setEditing(null)
  }

  function editResource(resource) {
    setEditing(resource)
    setTitle(resource.title)
    setDescription(resource.description || emptyTranslations())
    setCategory(resource.category)
    setSubjectId(resource.subject_id || '')
    setFile(null)
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    let uploadPath = ''
    let metadataRequestStarted = false
    try {
      const metadata = { title, description, category, subject_id: subjectId || null }
      if (editing) {
        await api(`/admin/resources/${editing.id}`, { token, method: 'PUT', body: JSON.stringify(metadata) })
      } else {
        if (!file) throw new Error(t(language, 'resourceChooseFile'))
        if (file.size > maxFileSize) throw new Error(t(language, 'resourceMaxSize'))
        const signed = await api('/admin/resources/upload-url', {
          token,
          method: 'POST',
          body: JSON.stringify({ file_name: file.name, file_size: file.size, mime_type: file.type }),
        })
        uploadPath = signed.path
        const { error: uploadError } = await supabase.storage.from('learning-resources')
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: signed.mime_type, upsert: false })
        if (uploadError) throw uploadError
        metadataRequestStarted = true
        await api('/admin/resources', {
          token,
          method: 'POST',
          body: JSON.stringify({
            ...metadata,
            upload_path: signed.path,
            file_name: file.name,
            file_size: file.size,
            mime_type: signed.mime_type,
          }),
        })
      }
      resetForm()
      await reload()
      onChanged()
    } catch (saveError) {
      if (uploadPath && !metadataRequestStarted) {
        try {
          await api('/admin/resources/upload', { token, method: 'DELETE', body: JSON.stringify({ path: uploadPath }) })
        } catch (cleanupError) {
          setError(`${saveError.message} · ${t(language, 'resourceCleanupFailed')}: ${cleanupError.message}`)
          return
        }
      }
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(resource) {
    if (!window.confirm(`${t(language, 'resourceDeleteConfirm')} “${text(resource.title, language)}”?`)) return
    setError('')
    try {
      await api(`/admin/resources/${resource.id}`, { token, method: 'DELETE' })
      if (editing?.id === resource.id) resetForm()
      await reload()
      onChanged()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return <>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="resource-admin-layout">
      <section className="panel resource-admin-list">
        <div className="panel-heading"><div><span className="section-kicker">{t(language, 'resourceEyebrow')}</span><h2>{t(language, 'resources')}</h2></div><span className="panel-count">{resources.length}</span></div>
        {resources.map((resource) => <div className="admin-row" key={resource.id}>
          <span className="admin-row-icon"><FileText size={16} /></span>
          <span className="admin-row-title"><b>{text(resource.title, language)}</b><small><CategoryLabel category={resource.category} language={language} /> · {resource.file_name}</small></span>
          <button aria-label={t(language, 'edit')} onClick={() => editResource(resource)}><Pencil size={15} /></button>
          <button aria-label={t(language, 'delete')} onClick={() => remove(resource)}><Trash2 size={15} /></button>
        </div>)}
        {!resources.length && <div className="empty-message">{t(language, 'resourceNoFiles')}</div>}
      </section>
      <section className="panel admin-form-panel">
        <div className="panel-heading"><div><span className="section-kicker">{t(language, 'languageEyebrow')}</span><h2>{editing ? t(language, 'edit') : t(language, 'resourceUpload')}</h2></div>{editing && <button className="icon-quiet" onClick={resetForm} aria-label={t(language, 'cancel')}><X size={17} /></button>}</div>
        <form className="admin-form" onSubmit={save}>
          <ResourceTranslations label={t(language, 'resourceTitle')} value={title} required onChange={(code, value) => setTitle((current) => ({ ...current, [code]: value }))} />
          <ResourceTranslations label={t(language, 'resourceDescription')} value={description} multiline onChange={(code, value) => setDescription((current) => ({ ...current, [code]: value }))} />
          <label className="field-label">{t(language, 'resourceCategory')}<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}><CategoryLabel category={item} language={language} /></option>)}</select></label>
          <label className="field-label">{t(language, 'resourceSubject')}<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">{t(language, 'resourceAllSubjects')}</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          {!editing && <label className="field-label">{t(language, 'resourceFile')}<input className="resource-file-input" type="file" required accept={acceptedFiles} onChange={(event) => setFile(event.target.files?.[0] || null)} /><small className="resource-hint">{t(language, 'resourceUploadHint')} · {t(language, 'resourceMaxSize')}</small></label>}
          {editing && <p className="resource-hint">{t(language, 'resourceEditingHint')}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? t(language, 'resourceUploading') : editing ? t(language, 'save') : t(language, 'resourceUpload')}<>{editing ? <Pencil size={15} /> : <Upload size={15} />}</></button>
          {editing && <button type="button" className="button button-outline button-wide" onClick={resetForm}>{t(language, 'cancel')}<X size={15} /></button>}
        </form>
      </section>
    </div>
  </>
}
