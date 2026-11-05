import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isMock, sb } from './supabase'

export type Role = 'member' | 'staff' | 'admin'
export interface User { id: string; email: string; name: string }
interface Ctx {
  user: User | null; loading: boolean
  role: Role | null // null until known
  signIn: (email: string, pw: string) => Promise<string | null>
  signUp: (name: string, email: string, pw: string) => Promise<string | null>
  signOut: () => Promise<void>
}
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

// shortcut: mock accounts (plaintext, localStorage) exist only until Supabase keys are set; never ship without them.
const MOCK_USERS = 'mock-users', MOCK_SESSION = 'mock-session'
const read = (k: string) => JSON.parse(localStorage.getItem(k) ?? 'null')
const mockUser = (): User | null => {
  const email = read(MOCK_SESSION), u = email && (read(MOCK_USERS) ?? {})[email]
  return u ? { id: email, email, name: u.name } : null
}
const fromSb = (u: { id: string; email?: string; user_metadata?: { display_name?: string } } | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? '', name: u.user_metadata?.display_name ?? u.email?.split('@')[0] ?? '' } : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isMock ? mockUser() : null)
  const [loading, setLoading] = useState(!isMock)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (!user) return setRole(null)
    // shortcut: in mock mode an email starting with "admin" counts as admin, so both paths are testable.
    if (!sb) return setRole(user.email.startsWith('admin') ? 'admin' : 'member')
    let stale = false
    sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!stale) setRole((data?.role as Role) ?? 'member') })
    return () => { stale = true }
  }, [user])

  useEffect(() => {
    if (!sb) return
    sb.auth.getSession().then(({ data }) => { setUser(fromSb(data.session?.user)); setLoading(false) })
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(fromSb(s?.user)))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<Ctx>(() => ({
    user, loading, role,
    async signIn(email, pw) {
      if (!sb) {
        const u = (read(MOCK_USERS) ?? {})[email]
        if (!u || u.password !== pw) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        localStorage.setItem(MOCK_SESSION, JSON.stringify(email)); setUser(mockUser()); return null
      }
      const { error } = await sb.auth.signInWithPassword({ email, password: pw })
      return error ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : null
    },
    async signUp(name, email, pw) {
      if (!sb) {
        const users = read(MOCK_USERS) ?? {}
        if (users[email]) return 'อีเมลนี้ถูกใช้งานแล้ว'
        localStorage.setItem(MOCK_USERS, JSON.stringify({ ...users, [email]: { name, password: pw } }))
        localStorage.setItem(MOCK_SESSION, JSON.stringify(email)); setUser(mockUser()); return null
      }
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { display_name: name } } })
      if (error) return error.message
      return data.session ? null : 'ส่งอีเมลยืนยันแล้ว กรุณายืนยันก่อนเข้าสู่ระบบ'
    },
    async signOut() {
      if (sb) await sb.auth.signOut()
      else { localStorage.removeItem(MOCK_SESSION); setUser(null) }
    },
  }), [user, loading, role])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
