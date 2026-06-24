import {
  getThorondorAuthConfig,
  getThorondorAuthorizationHeader,
} from '@/features/thorondor/services/thorondorAuth'

const CENTRAL_TIMEOUT_MS = 15000

function centralBasePath() {
  const { apiBaseUrl } = getThorondorAuthConfig()
  return apiBaseUrl ? `${apiBaseUrl}/thorondor/api` : ''
}

export function isThorondorCentralConfigured() {
  return Boolean(centralBasePath())
}

async function readPayload(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function requestCentral(path, options = {}) {
  const basePath = centralBasePath()
  if (!basePath) {
    throw new Error('API central de Thorondor no configurada')
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CENTRAL_TIMEOUT_MS)

  try {
    const response = await fetch(`${basePath}${path}`, {
      cache: 'no-store',
      mode: 'cors',
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...getThorondorAuthorizationHeader(),
        ...options.headers,
      },
      signal: controller.signal,
    })
    const payload = await readPayload(response)

    if (!response.ok) {
      const message = payload?.message || payload?.error || `API central fallida (${response.status})`
      const error = new Error(message)
      error.status = response.status
      error.payload = payload
      throw error
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('API central agotada tras 15s')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function fetchThorondorCentralSnapshot() {
  return requestCentral('/console/snapshot')
}

export function fetchThorondorEmailAlertSettings() {
  return requestCentral('/console/email-alerts/settings')
}

export function updateThorondorEmailAlertSettings(settings) {
  return requestCentral('/console/email-alerts/settings', {
    method: 'PUT',
    body: JSON.stringify(settings || {}),
  })
}

export function sendThorondorEmailAlertTest() {
  return requestCentral('/console/email-alerts/test', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchThorondorCentralEvents(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestCentral(`/console/events${suffix}`)
}

export function createThorondorCentralCommand(agentId, command) {
  return requestCentral(`/console/agents/${encodeURIComponent(agentId)}/commands`, {
    method: 'POST',
    body: JSON.stringify(command || {}),
  })
}

export function pollThorondorCentralAgentTelemetry(agentId, payload = {}) {
  return requestCentral(`/console/agents/${encodeURIComponent(agentId)}/telemetry/poll`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export function updateThorondorCentralAgent(agentId, payload) {
  return requestCentral(`/console/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload || {}),
  })
}

export function fetchThorondorSmartResponses() {
  return requestCentral('/console/smart-responses')
}

export function saveThorondorSmartResponse(policy) {
  const id = String(policy?.id || '').trim()
  if (id) {
    return requestCentral(`/console/smart-responses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(policy || {}),
    })
  }

  return requestCentral('/console/smart-responses', {
    method: 'POST',
    body: JSON.stringify(policy || {}),
  })
}

export function deleteThorondorSmartResponse(id) {
  return requestCentral(`/console/smart-responses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}

export function addThorondorCentralIpListEntry(entry) {
  return requestCentral('/console/ip-list', {
    method: 'POST',
    body: JSON.stringify(entry || {}),
  })
}

export function removeThorondorCentralIpListEntry(id, payload = {}) {
  return requestCentral(`/console/ip-list/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  })
}
