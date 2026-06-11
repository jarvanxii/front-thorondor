export interface ThorondorAuthSession {
  authenticated: boolean
  user: unknown | null
  providers: unknown[]
}

export function fetchThorondorSession(): Promise<ThorondorAuthSession>
export function fetchThorondorAdminUsers(): Promise<unknown>
export function fetchThorondorAdminLogs(filters?: {
  userId?: string
  category?: string
  severity?: string
  query?: string
  limit?: number
}): Promise<unknown>
export function updateThorondorAdminUser(
  userId: string,
  payload: {
    enabled?: boolean
    usuarioAdmin?: boolean
    usuario_admin?: boolean
    usuarioAutorizado?: boolean
    usuario_autorizado?: boolean
  },
): Promise<unknown>
export function updateThorondorAdminUserAuthorization(
  userId: string,
  usuarioAutorizado: boolean,
): Promise<unknown>
export function requestThorondorPasswordRecovery(payload: { email: string }): Promise<unknown>
export function confirmThorondorPasswordRecovery(payload: {
  resetId?: string
  reset_id?: string
  email?: string
  token: string
  password: string
}): Promise<ThorondorAuthSession>
export function sendThorondorContactMessage(payload: {
  name?: string
  email: string
  subject?: string
  message: string
  website?: string
}): Promise<unknown>
export function updateThorondorKeyAgents(payload: {
  keyAgents?: string
  key_agents?: string
  regenerate?: boolean
}): Promise<unknown>
