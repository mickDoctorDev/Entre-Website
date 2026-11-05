import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import CityMap from '../components/CityMap'
import { ago } from '../lib/geo'
import { awardPoints, setStatus, useStore, type Status } from '../lib/store'

const WASTE = [['ขยะทั่วไป', 38, '#7FA896'], ['รีไซเคิล', 31, '#3DFFA0'], ['เศษอาหาร', 22, '#B6F23D'], ['อันตราย', 9, '#FF6B6B']] as const
const NAV = ['Overview', 'Fleet', 'Points', 'Stations', 'Settings']

export default function Admin() {
  const s = useStore()
  const [now, setNow] = useState(new Date())
  const [member, setMember] = useState('')
  const [amt, setAmt] = useState(1)
  const [err, setErr] = useState('')
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])

  const online = s.trucks.filter((t) => t.status !== 'offline').length
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const code = member.trim().toUpperCase()
    if (!/^M-\d{4,}$/.test(code)) return setErr('รูปแบบรหัสสมาชิก: M-1234')
    const msg = await awardPoints(code, amt)
    setErr(msg ?? ''); if (!msg) setMember('')
  }

  return (
    <div className="admin">
      <aside className="side">
        <div className="brand"><span className="dot" />T·POINT<small>OPS</small></div>
        {NAV.map((n, i) => <a key={n} className={i === 0 ? 'on' : ''} href="#">{n}</a>)}
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

        <section className="kpis">
          <Kpi label="Trucks online" value={`${online}/${s.trucks.length}`} />
          <Kpi label="Toilet entries" value={s.entries.toLocaleString()} />
          <Kpi label="T Points issued" value={s.tIssued.toLocaleString()} />
          <Kpi label="Trash sorted" value={`${s.kg.toFixed(1)} kg`} />
        </section>

        <section className="grid">
          <div className="glass panel radar">
            <h2>Live fleet radar</h2>
            <CityMap trucks={s.trucks} stations={s.stations} dark radar fit="meet" />
          </div>

          <div className="glass panel fleet">
            <h2>Fleet</h2>
            <div className="tbl" role="table">
              {s.trucks.map((t) => (
                <div key={t.id} className="row" role="row">
                  <span className={`led led-${t.status}`} />
                  <div><b>{t.name}</b><small>{t.zone}</small></div>
                  <small className="num">{ago(t.updatedAt)}</small>
                  <small className="num">Q {t.queue}</small>
                  <select value={t.status} aria-label={`สถานะ ${t.name}`} onChange={(e) => setStatus(t.id, e.target.value as Status)}>
                    <option value="available">available</option><option value="busy">busy</option><option value="offline">offline</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="glass panel">
            <h2>Entries / hour <small>08:00 → 19:00</small></h2>
            <Area data={s.hourly} />
          </div>

          <div className="glass panel">
            <h2>Waste breakdown</h2>
            <Donut />
          </div>

          <div className="glass panel award">
            <h2>Award T Points <small>staff confirm</small></h2>
            <form onSubmit={submit}>
              <input value={member} onChange={(e) => setMember(e.target.value)} placeholder="M-1234" aria-label="รหัสสมาชิก" aria-invalid={!!err} />
              <select value={amt} onChange={(e) => setAmt(+e.target.value)} aria-label="จำนวน T">{[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>+{n} T</option>)}</select>
              <button className="neon">Award</button>
            </form>
            {err && <p className="err" role="alert">{err}</p>}
          </div>

          <div className="glass panel feed">
            <h2>Activity <i className="live" /></h2>
            <ul>
              {s.feed.slice(0, 8).map((f) => (
                <li key={f.id} className={`k-${f.kind}`}><time>{new Date(f.t).toLocaleTimeString('en-GB')}</time>{f.text}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

const Kpi = ({ label, value }: { label: string; value: string }) => (
  <div className="glass kpi"><span>{label}</span><b className="num">{value}</b></div>
)

function Area({ data }: { data: number[] }) {
  const w = 320, h = 120, max = Math.max(...data) * 1.15
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * h])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} className="area" role="img" aria-label="กราฟจำนวนการเข้าห้องน้ำรายชั่วโมง">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3DFFA0" stopOpacity=".45" /><stop offset="1" stopColor="#3DFFA0" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h}Z`} fill="url(#ag)" /><path d={line} fill="none" stroke="#3DFFA0" strokeWidth="2" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#050E09" stroke="#3DFFA0" />)}
    </svg>
  )
}

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
