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

  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: 'GET',
    cache: 'no-store',
    mode: 'cors',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`No se pudo leer la sesion (${response.status})`)
  }

  const session = await response.json()
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

  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    cache: 'no-store',
    mode: 'cors',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`No se pudo cerrar la sesion (${response.status})`)
  }

  const session = await response.json()
  saveThorondorSession(session)
  return session
}
