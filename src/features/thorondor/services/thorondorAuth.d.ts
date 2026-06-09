export interface ThorondorAuthSession {
  authenticated: boolean
  user: unknown | null
  providers: unknown[]
}

export function fetchThorondorSession(): Promise<ThorondorAuthSession>
