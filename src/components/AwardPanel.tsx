import { useState, type FormEvent } from 'react'
import { awardTo, useStore } from '../lib/store'

// One field for either an email or a member_code, plus the latest awards underneath.
export default function AwardPanel() {
  const { feed } = useStore()
  const [who, setWho] = useState('')
  const [amount, setAmount] = useState('5')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const w = who.trim(), n = Number(amount)
    setOk('')
    const isCode = /^M-\d{4,}$/i.test(w)
    if (!isCode && !/^\S+@\S+\.\S+$/.test(w)) return setErr('ใส่อีเมล หรือรหัสสมาชิก เช่น M-1234')
    if (!Number.isInteger(n) || n < 1 || n > 500) return setErr('จำนวนต้องเป็นเลขเต็ม 1–500')
    const target = isCode ? w.toUpperCase() : w.toLowerCase()
    setBusy(true)
    const msg = await awardTo(target, n)
    setBusy(false)
    setErr(msg ?? '')
    if (!msg) { setWho(''); setOk(`เพิ่ม +${n} T ให้ ${target} แล้ว`) }
  }
  const recent = feed.filter((f) => f.kind === 'earn').slice(0, 5)

  return (
    <div className="glass panel award" id="award">
      <h2>Award T Points</h2>
      <form onSubmit={submit} noValidate>
        <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="member@email.com หรือ M-1234" autoComplete="off" spellCheck={false} aria-label="อีเมลหรือรหัสสมาชิก" aria-invalid={!!err} aria-describedby="award-msg" />
        <div className="award-row">
          <input type="number" inputMode="numeric" min={1} max={500} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="จำนวน T Point" />
          <button className="neon" disabled={busy}>{busy ? 'กำลังเพิ่ม…' : 'Award'}</button>
        </div>
      </form>
      <div id="award-msg">
        {err && <p className="err" role="alert">{err}</p>}
        {ok && <p className="ok" role="status">{ok}</p>}
      </div>
      <h3 className="recent-h">Recent awards</h3>
      {recent.length === 0 && <p className="sub">ยังไม่มีรายการ</p>}
      <ul className="recent">{recent.map((f) => <li key={f.id} className="k-earn"><time>{new Date(f.t).toLocaleTimeString('en-GB')}</time>{f.text}</li>)}</ul>
    </div>
  )
}
