import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '@/lib/api'

export type AuthUser = {
  id: string
  email: string
  nickname: string | null
  avatarUrl: string | null
  role: string
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'gym-map.token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const me = await apiFetch<AuthUser>('/users/me', { token })
        if (!cancelled) setUser(me)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        if (!cancelled) setToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadUser()
    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    setToken(res.accessToken)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await apiFetch('/auth/register', { method: 'POST', body: { email, password } })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
