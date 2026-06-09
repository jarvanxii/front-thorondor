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

const DEFAULT_CALLBACK_PATH = '/#/auth/callback'
const THORONDOR_SESSION_STORAGE_KEY = 'thorondor.session'
const AUTH_REQUEST_TIMEOUT_MS = 15000

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

  return `${window.location.origin}${window.location.pathname}${callbackPath}`
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

export async function logoutThorondorSession() {
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

  const session = await requestThorondorAuth('/auth/logout', {
    method: 'POST',
  })
  saveThorondorSession(session)
  return session
}

export async function fetchThorondorAdminUsers() {
  return requestThorondorAuth('/auth/admin/users', {
    method: 'GET',
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

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: 'no-store',
      mode: 'cors',
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const body = isJson ? await response.json() : null

    if (!response.ok) {
      throw new Error(body?.message || `Peticion auth fallida (${response.status})`)
    }

    return body
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La API de autenticacion no respondio en 15s')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
