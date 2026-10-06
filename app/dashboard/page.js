'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('booksforward_user')
        return cached ? JSON.parse(cached) : null
      } catch { return null }
    }
    return null
  })
  const [loading, setLoading] = useState(!user)
  const ADMIN_PHONE = '0753520252'
  const HOT_GREEN = '#00C853'

  const normalizePhone = (phone) => {
    if (!phone) return ''
    phone = String(phone).trim().replace(/\D/g, '')
    if (!/^07\d{8}$/.test(phone)) return ''
    return phone
  }

  const loadUser = async () => {
    const cachedData = localStorage.getItem('booksforward_user')
    let localUser = null
    try { if (cachedData) localUser = JSON.parse(cachedData) } catch { localUser = null }
    if (!localUser && !user) { setLoading(false); router.replace('/register'); return }
    try {
      const cleanPhone = normalizePhone(localUser?.phone || user?.phone)
      const res = await fetch(`/api/user?action=getDashboard&phone=${cleanPhone}&_t=${Date.now()}`)
      const data = await res.json()
      if (data.success && data.user) {
        localStorage.setItem('booksforward_user', JSON.stringify(data.user))
        setUser(data.user)
      }
    } catch (e) {} finally { setLoading(false) }
  }

  useEffect(() => { loadUser() }, [])

  const menuItems = [
    { icon: '💰', label: 'Deposit', href: '/deposit' },
    { icon: '💸', label: 'Withdraw', href: '/withdraw' },
    { icon: '👑', label: 'VIP Levels', href: '/viplevels' },
    { icon: '🧾', label: 'Transactions', href: '/transactions' },
    { icon: '🎁', label: 'Invite', href: '/invite' },
    { icon: '🤝', label: 'Myteam', href: '/myteam' },
    { icon: '📚', label: 'About', href: '/about' },
    { icon: '📲', label: 'Download App', href: '/downloadapp' },
    { icon: '🎰', label: 'Lucky Wheel', href: '/wheel' },
    { icon: '💬', label: 'Manager', href: '/manager' }
  ]

  const isAdmin = normalizePhone(user?.phone) === ADMIN_PHONE

  if (loading) return <div style={{padding:'40px', textAlign:'center', background:'#fff'}}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      
      {/* 1. HEADER HOT GREEN */}
      <h1 style={{
        margin: '0',
        padding: '15px 0 12px',
        fontSize: '30px',
        fontWeight: '900',
        color: HOT_GREEN,
        textAlign: 'center',
        letterSpacing: '1.5px',
        background: '#FFFFFF'
      }}>
        BOOKSFORWARD
      </h1>

      {/* 2. IMAGE FULL WIDTH - EDGE TO EDGE */}
      <div style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        height: '210px',
        overflow: 'hidden',
        background: '#fff',
        marginBottom: '22px'
      }}>
        <img
          src="/book.jpg"
          alt="BooksForward Banner"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display:'block' }}
        />
      </div>

      {/* 3. CONTENT WITH PADDING */}
      <main style={{ background: '#FFFFFF', padding: '0 20px 90px', maxWidth:'480px', margin:'0 auto' }}>

        {/* BUTTONS HOT GREEN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 15px' }}>
          {menuItems.map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100%', height: '95px',
                  background: HOT_GREEN,
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '30px', color: '#fff',
                  boxShadow: '0 4px 12px rgba(0,200,83,0.35)'
                }}>
                  {item.icon}
                </div>
                <p style={{ margin: '7px 0 0', fontSize: '12px', fontWeight: '800', color: '#111' }}>
                  {item.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ADMIN ONLY */}
        {isAdmin && (
          <div onClick={() => router.push('/admin')} style={{
            marginTop:'22px', width:'100%', height:'85px', background:'#111', borderRadius:'14px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            fontSize:'26px', color:'#fff', cursor:'pointer', border:`2px solid ${HOT_GREEN}`
          }}>
            🔐 <span style={{fontSize:'12px', fontWeight:'900', marginTop:'4px'}}>Admin Panel</span>
          </div>
        )}

      </main>
    </div>
  )
}