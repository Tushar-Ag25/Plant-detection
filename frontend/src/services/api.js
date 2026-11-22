const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

let cachedToken = null
let tokenProvider = null

export function setTokenProvider(fn) {
  tokenProvider = fn
}

async function getHeaders() {
  const headers = {}
  if (tokenProvider) {
    const token = await tokenProvider()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

async function checkBackend() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function diagnose(imageFile, cropName, fieldName, growthStage) {
  const headers = await getHeaders()
  const formData = new FormData()
  formData.append('image', imageFile)
  formData.append('cropName', cropName)
  formData.append('fieldName', fieldName || 'Unnamed Plot')
  formData.append('growthStage', growthStage || 'Mature')

  const res = await fetch(`${BASE_URL}/api/diagnose`, {
    method: 'POST',
    headers,
    body: formData
  })
  if (!res.ok) throw new Error('Diagnosis failed')
  return res.json()
}

async function getHistory(filters = {}) {
  const headers = await getHeaders()
  const params = new URLSearchParams()
  if (filters.cropName) params.set('cropName', filters.cropName)
  if (filters.fieldName) params.set('fieldName', filters.fieldName)
  
  const res = await fetch(`${BASE_URL}/api/history?${params}`, { headers })
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

async function getRecurring() {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/analytics/recurring`, { headers })
  if (!res.ok) throw new Error('Failed to load analytics')
  return res.json()
}

async function deleteEntry(id) {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/history/${id}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) throw new Error('Failed to delete entry')
  return res.json()
}

export const api = {
  checkBackend,
  diagnose,
  getHistory,
  getRecurring,
  deleteEntry
}

export default api
