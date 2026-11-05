// MOCK GPS store. Same shape the Supabase hook will return later — swap this file, not the UI.
import { useSyncExternalStore } from 'react'
import { fromXY, distM } from './geo'
import { sb } from './supabase'

export type Status = 'available' | 'busy' | 'offline'
export interface Truck { id: string; name: string; zone: string; status: Status; lat: number; lng: number; queue: number; updatedAt: number; wp: number }
export interface FeedItem { id: number; t: number; kind: 'earn' | 'redeem' | 'status' | 'gps'; text: string }
export interface State { trucks: Truck[]; feed: FeedItem[]; entries: number; tIssued: number; kg: number; hourly: number[] }

// Patrol loops in map units (x,y).
const route: Record<string, [number, number][]> = {
  t1: [[230, 270], [272, 265], [274, 300], [232, 305]],
  t2: [[120, 330], [152, 325], [152, 362], [118, 362]],
  t3: [[110, 215], [142, 210], [144, 240], [108, 242]],
  t4: [[236, 350], [276, 348], [276, 378], [236, 380]],
  t5: [[300, 225], [332, 222], [334, 258], [302, 260]],
  t6: [[165, 372]],
}
const meta: [string, string, Status, number][] = [
  ['t1', 'สยามสแควร์', 'available', 3], ['t2', 'MBK', 'busy', 8], ['t3', 'จุฬาลงกรณ์ฯ', 'available', 1],
  ['t4', 'สามย่าน', 'available', 4], ['t5', 'เซ็นทรัลเวิลด์', 'available', 2], ['t6', 'ลุมพินี', 'offline', 0],
]
const now = Date.now()
const trucks: Truck[] = meta.map(([id, zone, status, queue], i) => {
  const [x, y] = route[id][0]
  return { id, name: `Truck 0${i + 1}`, zone, status, queue, ...fromXY(x, y), wp: 1 % route[id].length, updatedAt: status === 'offline' ? now - 240000 : now }
})
// With Supabase configured, trucks come from the DB (+realtime); feed & KPIs stay mock until those tables exist.
interface TruckRow { id: string; name: string; zone: string; status: Status; lat: number; lng: number; queue_est: number; updated_at: string }
const fromRow = (r: TruckRow): Truck => ({ id: r.id, name: r.name, zone: r.zone, status: r.status, lat: r.lat, lng: r.lng, queue: r.queue_est, updatedAt: Date.parse(r.updated_at), wp: 0 })

let id = 0
const feed = (kind: FeedItem['kind'], text: string): FeedItem => ({ id: ++id, t: Date.now(), kind, text })
let state: State = {
  trucks: sb ? [] : trucks, entries: 312, tIssued: 640, kg: 428.6,
  hourly: [3, 5, 9, 14, 22, 31, 28, 35, 41, 38, 26, 18],
  feed: [feed('earn', 'M-1042 ได้รับ +3 T · Truck 01'), feed('redeem', 'M-0877 ใช้ 1 T · Truck 01'), feed('status', 'Truck 06 ออฟไลน์ (ไม่มีสัญญาณ GPS)'), feed('earn', 'M-2210 ได้รับ +2 T · Truck 05')],
}

const listeners = new Set<() => void>()
const emit = (s: State) => { state = s; listeners.forEach((l) => l()) }
const rnd = (n: number) => Math.floor(Math.random() * n)

function step(t: Truck): Truck {
  if (t.status === 'offline') return t
  const pts = route[t.id], [tx, ty] = pts[t.wp], target = fromXY(tx, ty), d = distM(t, target), stepM = 14
  if (d <= stepM) return { ...t, ...target, wp: (t.wp + 1) % pts.length, updatedAt: Date.now(), queue: Math.min(9, Math.max(0, t.queue + rnd(3) - 1)) }
  const f = stepM / d
  return { ...t, lat: t.lat + (target.lat - t.lat) * f, lng: t.lng + (target.lng - t.lng) * f, updatedAt: Date.now() }
}

let tickN = 0
function tick() {
  tickN++
  let { feed: fd, entries, tIssued, kg, hourly } = state
  const live = state.trucks.filter((t) => t.status !== 'offline')
  if (tickN % 2 === 0) {
    const member = `M-${1000 + rnd(9000)}`
    if (Math.random() < 0.55) {
      // sorting bins are locked on the trucks, so points are earned at a truck
      const n = 1 + rnd(4), tr = live[rnd(live.length)]
      if (tr) { fd = [feed('earn', `${member} ได้รับ +${n} T · ${tr.name}`), ...fd].slice(0, 30); tIssued += n; kg += n * 0.7 }
    } else {
      const tr = live[rnd(live.length)]
      if (tr) { fd = [feed('redeem', `${member} ใช้ 1 T · ${tr.name}`), ...fd].slice(0, 30); entries++; hourly = [...hourly.slice(0, -1), hourly[hourly.length - 1] + 1] }
    }
  }
  emit({ ...state, trucks: sb ? state.trucks : state.trucks.map(step), feed: fd, entries, tIssued, kg, hourly })
}

async function load() {
  if (!sb) return
  const t = await sb.from('trucks').select('*').order('name')
  if (t.error) return console.error('Supabase load failed', t.error)
  emit({ ...state, trucks: (t.data as TruckRow[]).map(fromRow) })
}

let timer: ReturnType<typeof setInterval> | undefined
let channel: ReturnType<NonNullable<typeof sb>['channel']> | undefined
const subscribe = (l: () => void) => {
  listeners.add(l)
  if (!timer) {
    timer = setInterval(tick, 2000)
    if (sb) {
      load()
      channel = sb.channel('trucks').on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, () => load()).subscribe()
    }
  }
  return () => {
    listeners.delete(l)
    if (!listeners.size) { clearInterval(timer); timer = undefined; if (channel) sb?.removeChannel(channel); channel = undefined }
  }
}
export const useStore = () => useSyncExternalStore(subscribe, () => state)

export async function setStatus(tid: string, status: Status) {
  const tr = state.trucks.find((t) => t.id === tid)
  if (!tr || tr.status === status) return
  if (sb) {
    const { error } = await sb.from('trucks').update({ status }).eq('id', tid)
    if (error) return console.error('status update refused', error.message) // RLS: staff only
    return load()
  }
  emit({ ...state, trucks: state.trucks.map((t) => (t.id === tid ? { ...t, status, updatedAt: Date.now() } : t)), feed: [feed('status', `${tr.name} → ${status}`), ...state.feed].slice(0, 30) })
}
/** Award T Points to a member by email. Returns an error message, or null on success. */
export async function awardPoints(email: string, amount: number): Promise<string | null> {
  if (sb) {
    const { error } = await sb.rpc('award_points_by_email', { p_email: email, p_amount: amount })
    if (error) {
      const m = error.message
      return m.includes('unknown member') ? 'ไม่พบสมาชิกที่ใช้อีเมลนี้' : m.includes('staff only') ? 'บัญชีนี้ไม่มีสิทธิ์มอบ T Point' : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'
    }
  }
  emit({ ...state, tIssued: state.tIssued + amount, feed: [feed('earn', `${email} ได้รับ +${amount} T · เจ้าหน้าที่ยืนยัน`), ...state.feed].slice(0, 30) })
  return null
}
