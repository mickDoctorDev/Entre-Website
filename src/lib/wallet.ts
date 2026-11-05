import { useCallback, useEffect, useState } from 'react'
import { useAuth, type User } from './auth'
import { sb } from './supabase'

export interface Entry { id: number | string; delta: number; reason: string; created_at: string }
export interface Wallet { code: string; balance: number; history: Entry[] }

// shortcut: mock wallet lives in localStorage (seeded with 3 T so the flow is testable); real data comes from Supabase.
const mockKey = (u: User) => `mock-wallet:${u.id}`
const mockWallet = (u: User): Wallet => {
  const saved = localStorage.getItem(mockKey(u))
  if (saved) return JSON.parse(saved)
  const h = [...u.id].reduce((a, c) => a + c.charCodeAt(0), 0)
  return { code: `M-${1000 + (h % 9000)}`, balance: 3, history: [{ id: 1, delta: 3, reason: 'sort_reward', created_at: new Date().toISOString() }] }
}

async function fetchWallet(u: User): Promise<Wallet> {
  if (!sb) return mockWallet(u)
  const [p, b, l] = await Promise.all([
    sb.from('profiles').select('member_code').eq('id', u.id).maybeSingle(),
    sb.from('t_balance').select('balance').eq('user_id', u.id).maybeSingle(),
    sb.from('t_ledger').select('id,delta,reason,created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(30),
  ])
  return { code: p.data?.member_code ?? '', balance: b.data?.balance ?? 0, history: (l.data as Entry[]) ?? [] }
}

export function useWallet() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const reload = useCallback(async () => setWallet(user ? await fetchWallet(user) : null), [user])
  useEffect(() => { reload() }, [reload])
  return { wallet, reload }
}

export type Redeemed = { code: string; expiresAt: number } | { error: string }

export async function redeemToilet(u: User, truckId: string): Promise<Redeemed> {
  if (!sb) {
    const w = mockWallet(u)
    if (w.balance < 1) return { error: 'T Point ไม่พอ' }
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    localStorage.setItem(mockKey(u), JSON.stringify({ ...w, balance: w.balance - 1, history: [{ id: Date.now(), delta: -1, reason: 'redeem', created_at: new Date().toISOString() }, ...w.history] }))
    return { code, expiresAt: Date.now() + 60000 }
  }
  const { data, error } = await sb.rpc('redeem_toilet', { p_truck: truckId })
  if (error) {
    const m = error.message
    return { error: m.includes('enough') ? 'T Point ไม่พอ' : m.includes('unavailable') ? 'รถคันนี้ไม่พร้อมให้บริการ' : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' }
  }
  return { code: data as string, expiresAt: Date.now() + 60000 }
}
