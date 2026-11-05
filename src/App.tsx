import { Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Entry from './pages/Entry'
import Login from './pages/Login'
import Wallet from './pages/Wallet'

const Soon = () => (
  <div className="soon"><p>เร็วๆ นี้ · Coming soon</p><Link to="/">← กลับไปแผนที่</Link></div>
)
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/entry" element={<Entry />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Soon />} />
    </Routes>
  )
}
