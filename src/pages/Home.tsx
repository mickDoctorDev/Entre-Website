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
const FILTERS = [['all', 'ทั้งหมด'], ['available', 'ว่างตอนนี้'], ['trucks', 'รถห้องน้ำ'], ['stations', 'จุดแยกขยะ']] as const
type Filter = (typeof FILTERS)[number][0]
const STATUS = { available: 'ว่าง', busy: 'คนเยอะ', offline: 'ออฟไลน์' } as const

export default function Home() {
  const { trucks, stations } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [picked, setPicked] = useState<string>()
  const [toast, setToast] = useState('')
  const cards = useRef<Record<string, HTMLElement | null>>({})
  const time = useClock()
  const { user } = useAuth()
  const nav = useNavigate()
  const { wallet, reload } = useWallet()
  const [busy, setBusy] = useState(false)

  const list = useMemo(
    () => trucks.map((t) => ({ t, d: distM(USER, t) })).filter(({ t }) => t.status !== 'offline' || filter === 'all' || filter === 'trucks').sort((a, b) => a.d - b.d),
    [trucks, filter],
  )
  const near = list.find(({ t }) => t.status !== 'offline')
  const shown = filter === 'available' ? list.filter(({ t }) => t.status === 'available') : list
  const selected = picked ?? near?.t.id

  useEffect(() => { if (picked) cards.current[picked]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }, [picked])
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
      <CityMap trucks={filter === 'available' ? trucks.filter((t) => t.status === 'available') : trucks} stations={stations} user={USER}
        nearestId={near?.t.id} nearestDist={near?.d} selectedId={selected} onSelect={setPicked}
        showTrucks={filter !== 'stations'} showStations={filter === 'all' || filter === 'stations'} />

      <header className="top">
        <div>
          <button className="city">ปทุมวัน, กรุงเทพฯ <IconChevron /></button>
          <div className="chip glass">☀ 31°C · {time}</div>
        </div>
        <Link id="login-target" to={user ? '/wallet' : '/login'} className="tbadge glass">
          <span className="tcoin">T</span>
          <span className="tname num">{user ? (wallet?.balance ?? '–') : 'เข้าสู่ระบบ'}</span>
          <span className="avatar">{user ? user.name.slice(0, 1).toUpperCase() : <IconUser />}</span>
        </Link>
      </header>

      <section className="sheet" aria-label="รถห้องน้ำใกล้คุณ">
        <div className="chips" role="tablist">
          {FILTERS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={`fchip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="cards">
          {shown.length === 0 && <div className="card empty">ตอนนี้ยังไม่มีรถห้องน้ำที่ว่าง</div>}
          {shown.map(({ t, d }) => (
            <article key={t.id} ref={(el) => { cards.current[t.id] = el }} className={`card${selected === t.id ? ' sel' : ''}${t.status === 'offline' ? ' off' : ''}`}>
              <div className="card-tags">
                {t.id === near?.t.id && <span className="tag tag-near">ใกล้ที่สุด</span>}
                <span className={`tag tag-${t.status}`}>{STATUS[t.status]}</span>
              </div>
              <h3>{t.name} · {t.zone}</h3>
              <p className="meta"><IconNav /> {fmtDist(d)} · เดิน {walkMin(d)} นาที · คิว ~{t.queue} คน</p>
              <div className="card-act">
                <button className="btn btn-p" disabled={t.status === 'offline' || busy} onClick={() => use(t.id, `${t.name} · ${t.zone}`)}>ใช้ 1 T</button>
                <a className="btn btn-g" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`}>นำทาง</a>
              </div>
            </article>
          ))}
        </div>
      </section>

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
