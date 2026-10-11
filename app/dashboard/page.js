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
    { icon: '🧾', label: 'Transactions', href: '/transactions' },
    { icon: '💸', label: 'Withdraw', href: '/withdraw' },
    { icon: '💰', label: 'Deposit', href: '/deposit' },
    { icon: '🎰', label: 'Magical Wheel', href: '/magicalwheel' },
    { icon: '🎁', label: 'Invite', href: '/invite' },
    { icon: '📲', label: 'Download App', href: '/downloadapp' },
    { icon: '🤝', label: 'Team', href: '/team' },
    { icon: '🌍', label: 'About', href: '/about' },
  ]

  const isAdmin = normalizePhone(user?.phone) === ADMIN_PHONE

  if (loading) return <div style={{padding:'40px', textAlign:'center', background:'#fff'}}>Loading...</div>

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundImage: "url('/book.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundRepeat: 'no-repeat',
      position:'relative',
      paddingBottom: '90px'
    }}>
      
      {/* TOP SPACER - pushed down so BOOKSFORWARD is fully seen */}
      <div style={{ height: '52vh', minHeight: '390px' }} />

      <main style={{ 
        background: 'transparent', 
        padding: '0 12px', 
        maxWidth:'480px', 
        margin:'0 auto' 
      }}>

        {/* FIRST ROW - NOW IN YOUR FIRST PINK BOX */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '10px'
        }}>
          {menuItems.slice(0,4).map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: HOT_GREEN,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                  border: '1.5px solid #fff'
                }}>
                  {item.icon}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '9px', fontWeight: '900', color: '#fff', lineHeight:'1.1', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {item.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* GAP - pushed to put second row in your second pink box */}
        <div style={{ height: '85px' }} />

        {/* SECOND ROW - NOW IN YOUR SECOND PINK BOX (lower) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '10px'
        }}>
          {menuItems.slice(4,8).map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: HOT_GREEN,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                  border: '1.5px solid #fff'
                }}>
                  {item.icon}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '9px', fontWeight: '900', color: '#fff', lineHeight:'1.1', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {item.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {isAdmin && (
          <div onClick={() => router.push('/admin')} style={{
            marginTop:'18px', width:'100%', height:'75px', background:'#111', borderRadius:'14px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            fontSize:'26px', color:'#fff', cursor:'pointer', border:`2px solid ${HOT_GREEN}`
          }}>
            🔐 <span style={{fontSize:'11px', fontWeight:'900', marginTop:'4px'}}>Admin Panel</span>
          </div>
        )}

      </main>

      {/* BOTTOM GAP - small now, flowers stay visible */}
      <div style={{ height: '6vh', minHeight: '40px' }} />

      <Link href="/manager" style={{ textDecoration:'none' }}>
        <div style={{
          position: 'fixed',
          bottom: '88px',
          right: '18px',
          width: '52px',
          height: '52px',
          background: HOT_GREEN,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          zIndex: 9999,
          border: '2px solid #fff'
        }}>
          🎧
        </div>
      </Link>

    </div>
  )
}