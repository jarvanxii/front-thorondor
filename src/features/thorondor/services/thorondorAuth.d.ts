export interface ThorondorAuthSession {
  authenticated: boolean
  user: unknown | null
  providers: unknown[]
}

export function fetchThorondorSession(): Promise<ThorondorAuthSession>
export function requestThorondorPasswordRecovery(payload: { email: string }): Promise<unknown>
export function confirmThorondorPasswordRecovery(payload: {
  resetId?: string
  reset_id?: string
  email?: string
  token: string
  password: string
}): Promise<ThorondorAuthSession>
