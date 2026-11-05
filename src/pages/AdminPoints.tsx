import { useState, type FormEvent } from 'react'
import { awardByCode, useStore } from '../lib/store'

// Admin-only page: add T Points to a member by member_code with a chosen amount.
export default function AdminPoints() {
  const { feed } = useStore()
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('10')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase(), n = Number(amount)
    setOk('')
    if (!/^M-\d{4,}$/.test(c)) return setErr('รูปแบบรหัสสมาชิก: M-1234')
    if (!Number.isInteger(n) || n < 1 || n > 500) return setErr('จำนวนต้องเป็นเลขจำนวนเต็ม 1–500')
    setBusy(true)
    const msg = await awardByCode(c, n)
    setBusy(false)
    setErr(msg ?? '')
    if (!msg) { setCode(''); setOk(`เพิ่ม +${n} T ให้ ${c} แล้ว`) }
  }
  const recent = feed.filter((f) => f.kind === 'earn').slice(0, 8)

  return (
    <section className="grid pts">
      <div className="glass panel award">
        <h2>Add T Points <small>admin only</small></h2>
        <form onSubmit={submit} noValidate>
          <label>รหัสสมาชิก (member_code)
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="M-1234" autoComplete="off" aria-invalid={!!err} aria-describedby="pts-msg" />
          </label>
          <label>จำนวน Point ที่ต้องการเพิ่ม
            <input type="number" inputMode="numeric" min={1} max={500} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} />
          </label>
          <button className="neon" disabled={busy}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่ม Point'}</button>
        </form>
        <div id="pts-msg">
          {err && <p className="err" role="alert">{err}</p>}
          {ok && <p className="ok" role="status">{ok}</p>}
        </div>
      </div>
      <div className="glass panel feed">
        <h2>Recent awards</h2>
        {recent.length === 0 && <p className="sub">ยังไม่มีรายการ</p>}
        <ul>{recent.map((f) => <li key={f.id} className="k-earn"><time>{new Date(f.t).toLocaleTimeString('en-GB')}</time>{f.text}</li>)}</ul>
      </div>
    </section>
  )
}
