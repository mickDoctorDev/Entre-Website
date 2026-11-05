import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../lib/auth'
import { useWallet } from '../lib/wallet'

const REASON: Record<string, string> = { sort_reward: 'แยกขยะ', redeem: 'เข้าห้องน้ำ', adjust: 'ปรับยอด' }
const fmt = (iso: string) => new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Wallet() {
  const { user, loading } = useAuth()
  const { wallet } = useWallet()
  const [qr, setQr] = useState('')
  useEffect(() => { if (wallet?.code) QRCode.toDataURL(wallet.code, { margin: 1, width: 240 }).then(setQr) }, [wallet?.code])

  return (
    <div className="app auth wallet">
      <h1 className="w-title">My T</h1>
      {!user && !loading && (
        <div className="auth-card">
          <span className="tcoin big">T</span>
          <h1>สะสม T Point</h1><p className="sub">เข้าสู่ระบบเพื่อดูยอดและรับ QR สมาชิก</p>
          <Link to="/login" state={{ from: '/wallet' }} className="btn btn-p wide">เข้าสู่ระบบ</Link>
        </div>
      )}
      {user && (
        <>
          <section className="bal">
            <span>T Point ของคุณ</span>
            <b className="num">{wallet?.balance ?? '–'}</b>
            <small>เข้าห้องน้ำได้ {wallet?.balance ?? 0} ครั้ง</small>
          </section>
          <section className="auth-card qr">
            {qr ? <img src={qr} width="160" height="160" alt={`QR สมาชิก ${wallet?.code}`} /> : <div className="qr-skel" />}
            <b className="num">{wallet?.code}</b>
            <small>แสดง QR นี้ให้เจ้าหน้าที่เพื่อรับ T Point</small>
          </section>
          <section className="auth-card hist">
            <h2>ประวัติ</h2>
            {wallet && wallet.history.length === 0 && <p className="sub">ยังไม่มีประวัติ — แยกขยะที่จุดกิจกรรมเพื่อรับ T</p>}
            <ul>
              {wallet?.history.map((e) => (
                <li key={e.id}><span>{REASON[e.reason] ?? e.reason}<small>{fmt(e.created_at)}</small></span><b className={`num ${e.delta > 0 ? 'plus' : ''}`}>{e.delta > 0 ? '+' : ''}{e.delta} T</b></li>
              ))}
            </ul>
          </section>
        </>
      )}
      <BottomNav active="wallet" />
    </div>
  )
}
