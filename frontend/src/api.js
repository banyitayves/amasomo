import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const apiUrl = import.meta.env.VITE_API_URL || ''

export const configured = Boolean(url && anonKey)
export const supabase = configured ? createClient(url, anonKey) : null

export async function api(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('API_UNAVAILABLE')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload
}
