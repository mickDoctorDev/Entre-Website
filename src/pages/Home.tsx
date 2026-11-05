import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CityMap from '../components/CityMap'
import Spotlight from '../components/Spotlight'
import { useAuth } from '../lib/auth'
import BottomNav from '../components/BottomNav'
import { IconChevron, IconNav, IconUser } from '../components/Icons'
import { distM, fmtDist, walkMin, fromXY } from '../lib/geo'
import { useStore } from '../lib/store'
import { redeemToilet, useWallet } from '../lib/wallet'

const USER = fromXY(190, 300) // mock device location (Siam). Replace with navigator.geolocation later.
const STATUS = { available: 'ว่าง', busy: 'คนเยอะ', offline: 'ออฟไลน์' } as const

export default function Home() {
  const { trucks } = useStore()
  const [open, setOpen] = useState(false) // cards stay hidden until the first pin tap, so the map is fully visible on landing
  const [picked, setPicked] = useState<string>()
  const [toast, setToast] = useState('')
  const cards = useRef<Record<string, HTMLElement | null>>({})
  const time = useClock()
  const { user, role } = useAuth()
  const nav = useNavigate()
  const { wallet, reload } = useWallet()
  const [busy, setBusy] = useState(false)
  const [navTo, setNavTo] = useState<string>() // truck id we are drawing a route to

  const list = useMemo(() => trucks.map((t) => ({ t, d: distM(USER, t) })).sort((a, b) => a.d - b.d), [trucks])
  const near = list.find(({ t }) => t.status !== 'offline')
  const selected = picked ?? near?.t.id
  const dest = list.find(({ t }) => t.id === navTo)

  useEffect(() => { if (picked) cards.current[picked]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }, [picked, open])
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500) }
  const use = async (truckId: string, truckName: string) => {
    if (!user) return nav('/login', { state: { from: '/' } })
    if (!wallet || wallet.balance < 1) return say('ยังไม่มี T Point — แยกขยะเพื่อรับ T')
    setBusy(true)
    const r = await redeemToilet(user, truckId)
    setBusy(false)
    if ('error' in r) { reload(); return say(r.error) }
    nav('/entry', { state: { ...r, truck: truckName } })
  }

  return (
    <div className="app">
      <CityMap trucks={trucks} user={USER} pannable route={navTo ? { id: navTo, to: USER } : undefined} nearestId={near?.t.id} nearestDist={near?.d} selectedId={selected}
        onSelect={(id) => { setPicked(id); setOpen(true) }} />

      <header className="top">
        <div>
          <button className="city">ปทุมวัน, กรุงเทพฯ <IconChevron /></button>
          <div className="chip glass">☀ 31°C · {time}</div>
          {role && role !== 'member' && <Link to="/admin" className="chip adminchip">⚙ {role === 'admin' ? 'Admin' : 'Staff'}</Link>}
        </div>
        <Link id="login-target" to={user ? '/wallet' : '/login'} className="tbadge glass">
          <span className="tcoin">T</span>
          <span className="tname num">{user ? (wallet?.balance ?? '–') : 'เข้าสู่ระบบ'}</span>
          <span className="avatar">{user ? user.name.slice(0, 1).toUpperCase() : <IconUser />}</span>
        </Link>
      </header>

      {dest && (
        <div className="routebar glass" role="status">
          <span className="rb-dot" />
          <span className="rb-t"><b>{dest.t.name}</b> · {fmtDist(dest.d)} · เดิน {walkMin(dest.d)} นาที</span>
          <a className="rb-a" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${dest.t.lat},${dest.t.lng}&travelmode=walking`} aria-label="เปิดใน Google Maps">↗</a>
          <button className="rb-x" onClick={() => setNavTo(undefined)} aria-label="ยกเลิกการนำทาง">×</button>
        </div>
      )}

      {open && (
        <section className="sheet" aria-label="รถห้องน้ำใกล้คุณ">
          <button className="sheet-x" onClick={() => setOpen(false)} aria-label="ซ่อนรายการรถ">×</button>
          <div className="cards">
            {list.map(({ t, d }) => (
              <article key={t.id} ref={(el) => { cards.current[t.id] = el }} className={`card${selected === t.id ? ' sel' : ''}${t.status === 'offline' ? ' off' : ''}`}>
                <div className="card-h">
                  <h3>{t.name} · {t.zone}</h3>
                  <span className="tags">
                    {t.id === near?.t.id && <span className="tag tag-near">★ ใกล้สุด</span>}
                    <span className={`tag tag-${t.status}`}>{STATUS[t.status]}</span>
                  </span>
                </div>
                <p className="meta"><IconNav /> {fmtDist(d)} · เดิน {walkMin(d)} นาที · คิว ~{t.queue} คน</p>
                <div className="card-act">
                  <button className="btn btn-p" disabled={t.status === 'offline' || busy} onClick={() => use(t.id, `${t.name} · ${t.zone}`)}>ใช้ 1 T</button>
                  <button className="btn btn-g" aria-pressed={navTo === t.id} onClick={() => { setNavTo(t.id); setPicked(t.id); setOpen(false) }}>{navTo === t.id ? 'กำลังนำทาง' : 'นำทาง'}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <BottomNav active="map" />
      {toast && <div className="toast" role="status">{toast}</div>}
      <Spotlight />
    </div>
  )
}

function useClock() {
  const fmt = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const [t, setT] = useState(fmt)
  useEffect(() => { const i = setInterval(() => setT(fmt()), 30000); return () => clearInterval(i) }, [])
  return t
}
