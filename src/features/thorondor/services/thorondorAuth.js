import appleIcon from '@/assets/images/auth/apple.svg'
import githubIcon from '@/assets/images/auth/github.svg'
import googleIcon from '@/assets/images/auth/google.svg'
import microsoftIcon from '@/assets/images/auth/microsoft.svg'

export const THORONDOR_SOCIAL_AUTH_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    description: 'Cuenta Google o Google Workspace',
    icon: googleIcon,
    tone: 'light',
    authPath: '/auth/oauth/google',
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    description: 'Microsoft personal, 365 o Entra ID',
    icon: microsoftIcon,
    tone: 'light',
    authPath: '/auth/oauth/microsoft',
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Cuenta de desarrollo y operaciones',
    icon: githubIcon,
    tone: 'dark',
    authPath: '/auth/oauth/github',
  },
  {
    id: 'apple',
    label: 'Apple',
    description: 'Acceso privado con Apple',
    icon: appleIcon,
    tone: 'dark',
    authPath: '/auth/oauth/apple',
  },
]

const DEFAULT_CALLBACK_PATH = '/login/callback'
const THORONDOR_SESSION_STORAGE_KEY = 'thorondor.session'
const THORONDOR_JWT_STORAGE_KEY = 'thorondor.jwt.session'
const THORONDOR_LEGACY_JWT_STORAGE_KEY = 'thorondor.jwt'
const AUTH_REQUEST_TIMEOUT_MS = 15000
const TOKEN_EXPIRY_SKEW_MS = 30000

let thorondorJwtMemoryToken = null

function getEnvValue(key) {
  return import.meta.env[key]?.trim?.() || ''
}

export function getThorondorAuthConfig() {
  return {
    apiBaseUrl: (
      getEnvValue('VITE_THORONDOR_API_BASE_URL') || getEnvValue('VITE_API_BASE_URL')
    ).replace(/\/+$/, ''),
    callbackPath: getEnvValue('VITE_THORONDOR_AUTH_CALLBACK_PATH') || DEFAULT_CALLBACK_PATH,
  }
}

export function getThorondorAuthReturnUrl() {
  const { callbackPath } = getThorondorAuthConfig()

  if (typeof window === 'undefined') {
    return callbackPath
  }

  const basePath = String(import.meta.env.BASE_URL || '/')
    .replace(/\/+$/, '')
    .replace(/^\/?/, '/')
  const normalizedBasePath = basePath === '/' ? '' : basePath
  const normalizedCallbackPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`

  return `${window.location.origin}${normalizedBasePath}${normalizedCallbackPath}`
}

export function buildThorondorSocialAuthUrl(providerId, options = {}) {
  const provider = THORONDOR_SOCIAL_AUTH_PROVIDERS.find((item) => item.id === providerId)
  const { apiBaseUrl } = getThorondorAuthConfig()

  if (!provider || !apiBaseUrl) {
    return ''
  }

  const authPath = provider.authPath.startsWith('/') ? provider.authPath : `/${provider.authPath}`
  const params = new URLSearchParams({
    flow: 'web',
    return_to: getThorondorAuthReturnUrl(),
  })

  if (options.rememberDevice) {
    params.set('remember_device', 'true')
  }

  if (options.workspaceId) {
    params.set('workspace_id', options.workspaceId)
  }

  return `${apiBaseUrl}${authPath}?${params.toString()}`
}

export function startThorondorSocialAuth(providerId, options = {}) {
  const url = buildThorondorSocialAuthUrl(providerId, options)

  if (!url) {
    return {
      started: false,
      reason: 'missing-api-base-url',
    }
  }

  window.location.assign(url)

  return {
    started: true,
    url,
  }
}

export function getStoredThorondorSession() {
  if (typeof window === 'undefined') {
    return {
      authenticated: false,
      user: null,
      providers: [],
    }
  }

  try {
    const raw = window.localStorage.getItem(THORONDOR_SESSION_STORAGE_KEY)
    return raw
      ? JSON.parse(raw)
      : {
          authenticated: false,
          user: null,
          providers: [],
        }
  } catch {
    return {
      authenticated: false,
      user: null,
      providers: [],
    }
  }
}

export function saveThorondorSession(session) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      THORONDOR_SESSION_STORAGE_KEY,
      JSON.stringify(
        session || {
          authenticated: false,
          user: null,
          providers: [],
        },
      ),
    )
  } catch {
    // Local storage is only a UI cache; the httpOnly cookie remains authoritative.
  }
}

function normalizeThorondorJwtToken(payload) {
  const accessToken = String(payload?.accessToken || payload?.access_token || '').trim()
  if (!accessToken) return null

  return {
    tokenType: String(payload?.tokenType || payload?.token_type || 'Bearer').trim() || 'Bearer',
    accessToken,
    expiresAt: String(payload?.expiresAt || payload?.expires_at || '').trim(),
    expiresInSeconds: Number(payload?.expiresInSeconds || payload?.expires_in || 0) || 0,
    user: payload?.user || null,
  }
}

export function isThorondorJwtTokenValid(token) {
  const normalized = normalizeThorondorJwtToken(token)
  if (!normalized) return false

  if (!normalized.expiresAt) return false

  const expiry = new Date(normalized.expiresAt).getTime()
  return Number.isFinite(expiry) && expiry > Date.now() + TOKEN_EXPIRY_SKEW_MS
}

export function getStoredThorondorJwtToken() {
  if (typeof window === 'undefined') return null

  if (isThorondorJwtTokenValid(thorondorJwtMemoryToken)) {
    return thorondorJwtMemoryToken
  }

  try {
    window.localStorage.removeItem(THORONDOR_LEGACY_JWT_STORAGE_KEY)
    const raw = window.sessionStorage.getItem(THORONDOR_JWT_STORAGE_KEY)
    const token = normalizeThorondorJwtToken(raw ? JSON.parse(raw) : null)
    if (!isThorondorJwtTokenValid(token)) {
      clearThorondorJwtToken()
      return null
    }
    thorondorJwtMemoryToken = token
    return token
  } catch {
    clearThorondorJwtToken()
    return null
  }
}

export function saveThorondorJwtToken(payload) {
  if (typeof window === 'undefined') return null

  const token = normalizeThorondorJwtToken(payload)
  if (!token) {
    clearThorondorJwtToken()
    return null
  }

  thorondorJwtMemoryToken = token
  try {
    window.localStorage.removeItem(THORONDOR_LEGACY_JWT_STORAGE_KEY)
    window.sessionStorage.setItem(THORONDOR_JWT_STORAGE_KEY, JSON.stringify(token))
  } catch {
    // El JWT también vive en memoria de Vuex; sessionStorage solo evita pedirlo en cada render.
  }
  return token
}

export function clearThorondorJwtToken() {
  thorondorJwtMemoryToken = null
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(THORONDOR_JWT_STORAGE_KEY)
    window.localStorage.removeItem(THORONDOR_LEGACY_JWT_STORAGE_KEY)
  } catch {
    // Nada que limpiar si el navegador bloquea el storage.
  }
}

export function getThorondorAuthorizationHeader() {
  const token = getStoredThorondorJwtToken()
  if (!token?.accessToken) return {}

  return {
    Authorization: `${token.tokenType || 'Bearer'} ${token.accessToken}`,
  }
}

export async function fetchThorondorSession() {
  const { apiBaseUrl } = getThorondorAuthConfig()
  if (!apiBaseUrl) {
    const localSession = {
      authenticated: false,
      user: null,
      providers: [],
    }
    saveThorondorSession(localSession)
    return localSession
  }

  const response = await requestThorondorAuth('/auth/session', {
    method: 'GET',
  })
  const session = response || {
    authenticated: false,
    user: null,
    providers: [],
  }
  saveThorondorSession(session)
  return session
}

export async function fetchThorondorJwtToken() {
  const { apiBaseUrl } = getThorondorAuthConfig()
  if (!apiBaseUrl) {
    clearThorondorJwtToken()
    return null
  }

  const token = await requestThorondorAuth('/auth/token', {
    method: 'GET',
    skipAuthHeader: true,
  })
  return saveThorondorJwtToken(token)
}

export async function loginThorondorCredentials(payload) {
  const session = await requestThorondorAuth('/auth/local/login', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      email: payload?.email || '',
      password: payload?.password || '',
    }),
  })
  saveThorondorSession(session)
  return session
}

export async function requestThorondorEmailSignup(payload) {
  return requestThorondorAuth('/auth/local/signup/start', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      displayName: payload?.displayName || '',
      email: payload?.email || '',
      password: payload?.password || '',
    }),
  })
}

export async function confirmThorondorEmailSignup(payload) {
  const session = await requestThorondorAuth('/auth/local/signup/confirm', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      email: payload?.email || '',
      code: payload?.code || '',
    }),
  })
  saveThorondorSession(session)
  return session
}

export async function requestThorondorPasswordRecovery(payload) {
  return requestThorondorAuth('/auth/local/recovery/start', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      email: payload?.email || '',
    }),
  })
}

export async function confirmThorondorPasswordRecovery(payload) {
  const session = await requestThorondorAuth('/auth/local/recovery/confirm', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      resetId: payload?.resetId || payload?.reset_id || '',
      email: payload?.email || '',
      token: payload?.token || '',
      password: payload?.password || '',
    }),
  })
  saveThorondorSession(session)
  return session
}

export async function sendThorondorContactMessage(payload) {
  return requestThorondorAuth('/auth/contact', {
    method: 'POST',
    skipAuthHeader: true,
    body: JSON.stringify({
      name: payload?.name || '',
      email: payload?.email || '',
      subject: payload?.subject || '',
      message: payload?.message || '',
      website: payload?.website || '',
    }),
  })
}

export async function updateThorondorKeyAgents(payload = {}) {
  return requestThorondorAuth('/auth/profile/key-agents', {
    method: 'PUT',
    body: JSON.stringify({
      keyAgents: payload?.keyAgents || payload?.key_agents || '',
      regenerate: Boolean(payload?.regenerate),
    }),
  })
}

export async function logoutThorondorSession() {
  const { apiBaseUrl } = getThorondorAuthConfig()
  if (!apiBaseUrl) {
    const localSession = {
      authenticated: false,
      user: null,
      providers: [],
    }
    saveThorondorSession(localSession)
    clearThorondorJwtToken()
    return localSession
  }

  try {
    const session = await requestThorondorAuth('/auth/logout', {
      method: 'POST',
    })
    saveThorondorSession(session)
    return session
  } finally {
    clearThorondorJwtToken()
  }
}

export async function fetchThorondorAdminUsers() {
  return requestThorondorAuth('/auth/admin/users', {
    method: 'GET',
  })
}

export async function fetchThorondorAdminLogs(filters = {}) {
  const params = new URLSearchParams()
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.category) params.set('category', filters.category)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.query) params.set('q', filters.query)
  if (filters.limit) params.set('limit', String(filters.limit))
  const suffix = params.toString() ? `?${params.toString()}` : ''

  return requestThorondorAuth(`/auth/admin/logs${suffix}`, {
    method: 'GET',
  })
}

export async function updateThorondorAdminUser(userId, payload = {}) {
  return requestThorondorAuth(`/auth/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function updateThorondorAdminUserAuthorization(userId, usuarioAutorizado) {
  return requestThorondorAuth(
    `/auth/admin/users/${encodeURIComponent(userId)}/authorization`,
    {
      method: 'PATCH',
      body: JSON.stringify({ usuarioAutorizado: Boolean(usuarioAutorizado) }),
    },
  )
}

async function requestThorondorAuth(path, options = {}) {
  const { apiBaseUrl } = getThorondorAuthConfig()
  if (!apiBaseUrl) {
    throw new Error('API Thorondor no configurada')
  }

  const { skipAuthHeader = false, headers = {}, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: 'no-store',
      mode: 'cors',
      credentials: 'include',
      ...fetchOptions,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(!skipAuthHeader ? getThorondorAuthorizationHeader() : {}),
        ...headers,
      },
      signal: controller.signal,
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const body = isJson ? await response.json() : null

    if (!response.ok) {
      throw new Error(body?.message || `Petición auth fallida (${response.status})`)
    }

    return body
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La API de autenticación no respondió en 15s')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
