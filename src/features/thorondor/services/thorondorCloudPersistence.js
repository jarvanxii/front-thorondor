import { getThorondorAuthConfig } from '@/features/thorondor/services/thorondorAuth'

export const THORONDOR_WORKSPACE_ID_KEY = 'thorondor.workspace.id'

const DEFAULT_WORKSPACE_ID = 'default'
const CLOUD_REQUEST_TIMEOUT_MS = 15000

function getEnvValue(key) {
  return import.meta.env[key]?.trim?.() || ''
}

function getStoredValue(key) {
  if (typeof window === 'undefined') return ''

  try {
    return window.localStorage.getItem(key)?.trim?.() || ''
  } catch {
    return ''
  }
}

function normalizeWorkspaceId(value) {
  return String(value || DEFAULT_WORKSPACE_ID)
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, '-')
}

export function getThorondorCloudPersistenceConfig() {
  const { apiBaseUrl } = getThorondorAuthConfig()
  const workspaceId = normalizeWorkspaceId(
    getEnvValue('VITE_THORONDOR_WORKSPACE_ID') || getStoredValue(THORONDOR_WORKSPACE_ID_KEY),
  )

  return {
    apiBaseUrl,
    workspaceId,
    enabled: Boolean(apiBaseUrl),
    basePath: apiBaseUrl
      ? `${apiBaseUrl}/thorondor/workspaces/${encodeURIComponent(workspaceId)}`
      : '',
  }
}

export function isThorondorCloudPersistenceConfigured() {
  return getThorondorCloudPersistenceConfig().enabled
}

function buildCloudHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function requestThorondorCloud(path, options = {}) {
  const config = getThorondorCloudPersistenceConfig()

  if (!config.enabled) {
    throw new Error('Persistencia cloud no configurada')
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CLOUD_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${config.basePath}${path}`, {
      cache: 'no-store',
      mode: 'cors',
      credentials: 'include',
      ...options,
      headers: {
        ...buildCloudHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const body = isJson ? await response.json() : null

    if (!response.ok) {
      throw new Error(body?.message || `Persistencia cloud fallida (${response.status})`)
    }

    return body
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Persistencia cloud agotada tras 15s')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function encodePathValue(value) {
  return encodeURIComponent(String(value))
}

export async function fetchThorondorCloudDataset() {
  return requestThorondorCloud('/dataset', {
    method: 'GET',
  })
}

export async function replaceThorondorCloudDataset(dataset) {
  return requestThorondorCloud('/dataset', {
    method: 'PUT',
    body: JSON.stringify(dataset || {}),
  })
}

export async function upsertThorondorCloudRecords(storeName, values) {
  if (!Array.isArray(values) || !values.length) return null

  return requestThorondorCloud(`/records/${encodePathValue(storeName)}/bulk`, {
    method: 'POST',
    body: JSON.stringify({ records: values }),
  })
}

export async function deleteThorondorCloudRecord(storeName, key) {
  return requestThorondorCloud(
    `/records/${encodePathValue(storeName)}/${encodePathValue(key)}`,
    {
      method: 'DELETE',
    },
  )
}

export async function deleteThorondorCloudRecordsByIndex(storeName, indexName, matchValue) {
  const params = new URLSearchParams({
    index: indexName,
    value: String(matchValue),
  })

  return requestThorondorCloud(`/records/${encodePathValue(storeName)}?${params.toString()}`, {
    method: 'DELETE',
  })
}

export async function clearThorondorCloudStore(storeName) {
  return requestThorondorCloud(`/records/${encodePathValue(storeName)}`, {
    method: 'DELETE',
  })
}

export async function setThorondorCloudMeta(key, value) {
  return requestThorondorCloud(`/meta/${encodePathValue(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export async function runThorondorCloudRetentionSweep(payload) {
  return requestThorondorCloud('/retention/sweep', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}
