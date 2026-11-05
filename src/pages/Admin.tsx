import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminScene from '../components/AdminScene'
import AwardPanel from '../components/AwardPanel'
import CityMap from '../components/CityMap'
import StatsChart from '../components/StatsChart'
import { ago } from '../lib/geo'
import { series, type Period } from '../lib/stats'
import { setStatus, useStore, type Status } from '../lib/store'

// 3D is loaded after the page is interactive; the SVG scene is the placeholder/fallback.
const Scene3D = lazy(() => import('../components/Scene3D'))

const WASTE = [['ขยะทั่วไป', 38, '#94A3B8'], ['รีไซเคิล', 31, '#10B26C'], ['เศษอาหาร', 22, '#FFC83D'], ['อันตราย', 9, '#FF7A66']] as const
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const NAV: [string, string | null][] = [['Overview', 'top'], ['Settings', null]]

export default function Admin() {
  const s = useStore()
  const [now, setNow] = useState(new Date())
  const [period, setPeriod] = useState<Period>('daily')
  const [pick, setPick] = useState<number | null>(null) // null = the latest bar (now)
  const [q, setQ] = useState('')
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])

  const online = s.trucks.filter((t) => t.status !== 'offline').length
  const sr = useMemo(() => series(period, s.hourly), [period, s.hourly])
  const load = sr.values[pick ?? sr.values.length - 1] / Math.max(...sr.values, 1) // drives the 3D crowd + truck speed
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    return k ? s.trucks.filter((t) => `${t.name} ${t.zone} ${t.status}`.toLowerCase().includes(k)) : s.trucks
  }, [s.trucks, q])

  return (
    <div className="admin" id="top">
      <div className="hero">
        <Suspense fallback={<AdminScene trucks={s.trucks} />}><Scene3D trucks={s.trucks} load={load} /></Suspense>
      </div>
      <aside className="side">
        <div className="brand"><span className="dot" />T·POINT<small>OPS</small></div>
        {NAV.map(([label, id], i) => (
          <button key={label} className={`nav-b${i === 0 ? ' on' : ''}`} disabled={!id} onClick={() => id && jump(id)}>{label}</button>
        ))}
        <Link to="/" className="back">← Public app</Link>
      </aside>

      <main className="main">
        <header className="a-top">
          <div><p className="eyebrow">PATHUM WAN · BANGKOK</p><h1>Command Center</h1></div>
          <div className="a-status">
            <span className="pill"><i className="live" /> GPS · MOCK</span>
            <span className="clock">{now.toLocaleTimeString('en-GB')}</span>
          </div>
        </header>

        {/* the 3D city is the full-screen backdrop; every panel floats on top of it */}
        <div className="stage">
          <div className="col l">
            <section className="kpis">
              <Kpi icon="🚛" label="Trucks online" value={`${online}/${s.trucks.length}`} />
              <Kpi icon="🚻" label="Toilet entries" value={s.entries.toLocaleString()} />
              <Kpi icon="🪙" label="T Points issued" value={s.tIssued.toLocaleString()} />
              <Kpi icon="♻️" label="Trash sorted" value={`${s.kg.toFixed(1)} kg`} />
            </section>
            <div className="glass panel"><h2>Waste breakdown</h2><Donut /></div>
            <AwardPanel />
          </div>

          <div className="col c"><StatsChart hourly={s.hourly} period={period} onPeriod={(p) => { setPeriod(p); setPick(null) }} selected={pick} onSelect={setPick} /></div>

          <div className="col r">
            <div className="glass panel fleet" id="fleet">
              <h2>Fleet <small>{shown.length}/{s.trucks.length}{shown.length > 5 ? ' · เลื่อนดู' : ''}</small></h2>
              <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา: ชื่อรถ โซน สถานะ" aria-label="ค้นหารถ" />
              <div className="tbl" role="table">
                {shown.length === 0 && <p className="sub">ไม่พบรถที่ค้นหา</p>}
                {shown.map((t) => (
                  <div key={t.id} className="row" role="row">
                    <span className={`led led-${t.status}`} />
                    <b>{t.name}</b>
                    <select value={t.status} aria-label={`สถานะ ${t.name}`} onChange={(e) => setStatus(t.id, e.target.value as Status)}>
                      <option value="available">available</option><option value="busy">busy</option><option value="offline">offline</option>
                    </select>
                    <small className="meta">{t.zone} · Q {t.queue} · {ago(t.updatedAt)}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass panel radar"><h2>Live fleet map</h2><CityMap trucks={s.trucks} dark fit="meet" /></div>
            <div className="glass panel feed">
              <h2>Activity <i className="live" /></h2>
              <ul>{s.feed.slice(0, 6).map((f) => <li key={f.id} className={`k-${f.kind}`}><time>{new Date(f.t).toLocaleTimeString('en-GB')}</time>{f.text}</li>)}</ul>
            </div>
          </div>
        </div>
      </main>

      <nav className="mnav" aria-label="เมนูมือถือ">
        <button onClick={() => jump('top')}>🏙️<span>Scene</span></button>
        <button onClick={() => jump('fleet')}>🚛<span>Fleet</span></button>
        <button onClick={() => jump('award')}>🪙<span>Award</span></button>
        <Link to="/">🏠<span>App</span></Link>
      </nav>
    </div>
  )
}

const Kpi = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="glass kpi"><span className="ki" aria-hidden="true">{icon}</span><div><span>{label}</span><b className="num">{value}</b></div></div>
)

function Donut() {
  let acc = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 42 42" role="img" aria-label="สัดส่วนประเภทขยะ">
        {WASTE.map(([n, v, c]) => { const el = <circle key={n} cx="21" cy="21" r="15.9" fill="none" stroke={c} strokeWidth="5" strokeDasharray={`${v - 1} ${101 - v}`} strokeDashoffset={25 - acc} />; acc += v; return el })}
      </svg>
      <ul>{WASTE.map(([n, v, c]) => <li key={n}><i style={{ background: c }} />{n}<b className="num">{v}%</b></li>)}</ul>
    </div>
  )
}
