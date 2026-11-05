import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { sb } from '../lib/supabase'

// Only staff/admin may open the ops dashboard. (Writes are protected again by RLS in the database.)
// shortcut: in mock mode (no Supabase keys) any logged-in user passes, so the dashboard stays demo-able.
export default function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [ok, setOk] = useState<boolean | null>(sb ? null : true)

  useEffect(() => {
    if (!sb || !user) return
    sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data }) => setOk(data?.role === 'staff' || data?.role === 'admin'))
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />
  if (ok === null) return null
  if (!ok) return <div className="soon"><p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้าผู้ดูแล</p><Link to="/">← กลับไปแผนที่</Link></div>
  return <>{children}</>
}
