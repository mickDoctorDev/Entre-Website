import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isMock } from '../lib/supabase'

type Errs = Partial<Record<'name' | 'email' | 'pw' | 'form', string>>

export default function Login() {
  const { user, role, signIn, signUp, signOut } = useAuth()
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [f, setF] = useState({ name: '', email: '', pw: '' })
  const [show, setShow] = useState(false)
  const [errs, setErrs] = useState<Errs>({})
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <div className="app auth">
        <Link to="/" className="back-l">← แผนที่</Link>
        <div className="auth-card">
          <span className="avatar big">{user.name.slice(0, 1).toUpperCase()}</span>
          <h1>{user.name}</h1><p className="sub">{user.email}</p>
          {role && role !== 'member' && <span className="role-badge">{role.toUpperCase()}</span>}
          {role && role !== 'member' && <Link to="/admin" className="btn btn-g wide">เปิดหน้าผู้ดูแล (Admin)</Link>}
          <button className="btn btn-p" onClick={signOut}>ออกจากระบบ</button>
        </div>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const email = f.email.trim().toLowerCase(), name = f.name.trim(), er: Errs = {}
    if (mode === 'up' && (!name || name.length > 40)) er.name = 'กรอกชื่อที่แสดง (ไม่เกิน 40 ตัวอักษร)'
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    if (f.pw.length < 8) er.pw = 'รหัสผ่านอย่างน้อย 8 ตัวอักษร'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const msg = mode === 'in' ? await signIn(email, f.pw) : await signUp(name, email, f.pw)
    setBusy(false)
    if (msg) setErrs({ form: msg }); else nav(from, { replace: true })
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const err = (k: keyof Errs) => errs[k] && <span id={`e-${k}`} className="ferr" role="alert">{errs[k]}</span>

  return (
    <div className="app auth">
      <Link to="/" className="back-l">← แผนที่</Link>
      <div className="auth-card">
        <span className="tcoin big">T</span>
        <h1>{mode === 'in' ? 'ยินดีต้อนรับกลับ' : 'สมัครสมาชิก'}</h1>
        <p className="sub">สะสม T Point แลกเข้าห้องน้ำฟรี</p>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setErrs({}) }}>เข้าสู่ระบบ</button>
          <button role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setErrs({}) }}>สมัครสมาชิก</button>
        </div>
        {errs.form && <div className="banner" role="alert">{errs.form}</div>}
        <form onSubmit={submit} noValidate>
          {mode === 'up' && (
            <label>ชื่อที่แสดง<input value={f.name} onChange={set('name')} autoComplete="nickname" maxLength={40} aria-invalid={!!errs.name} aria-describedby="e-name" />{err('name')}</label>
          )}
          <label>อีเมล<input type="email" value={f.email} onChange={set('email')} autoComplete="email" inputMode="email" aria-invalid={!!errs.email} aria-describedby="e-email" />{err('email')}</label>
          <label>รหัสผ่าน
            <span className="pw">
              <input type={show ? 'text' : 'password'} value={f.pw} onChange={set('pw')} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} aria-invalid={!!errs.pw} aria-describedby="e-pw" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{show ? 'ซ่อน' : 'แสดง'}</button>
            </span>{err('pw')}
          </label>
          <button className="btn btn-p wide" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
        </form>
        <Link to="/" className="guest">ใช้งานแบบผู้เยี่ยมชมต่อ</Link>
        {isMock && <p className="mock">โหมดทดสอบ: ยังไม่ได้ตั้งค่า Supabase บัญชีจะเก็บในเครื่องนี้เท่านั้น</p>}
      </div>
    </div>
  )
}
