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
