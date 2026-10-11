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
    <div style={{ minHeight: '100vh', background: '#FFFFFF', position:'relative' }}>
      
      {/* IMAGE FULL FROM TOP - NO HEADER */}
      <div style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        height: '260px',
        overflow: 'hidden',
        background: '#fff',
        marginBottom: '16px'
      }}>
        <img
          src="/book.jpg"
          alt="BooksForward Banner"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display:'block' }}
        />
      </div>

      <main style={{ background: '#FFFFFF', padding: '0 10px 110px', maxWidth:'480px', margin:'0 auto' }}>

        {/* 4 PER ROW - 2 LINES - VERY SMALL SIZE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {menuItems.map(item => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100%',
                  height: '62px',
                  position: 'relative',
                  filter: 'drop-shadow(0 3px 6px rgba(0,200,83,0.35))',
                }}>
                  <svg viewBox="0 0 200 135" width="100%" height="100%" style={{ display:'block' }}>
                    <path d="M10 20 C 55 6, 100 9, 100 9 C 100 9, 145 6, 190 20 L 190 115 C 145 101, 100 104, 100 104 C 100 104, 55 101, 10 115 Z" fill="#0A8F3A" />
                    <path d="M12 18 C 55 4, 99 7, 100 7 C 101 7, 145 4, 188 18 L 188 108 C 145 94, 101 97, 100 97 C 99 97, 55 94, 12 108 Z" fill={HOT_GREEN} />
                    <path d="M14 22 C 50 12, 90 13, 98 14 L 98 92 C 90 92, 50 91, 14 101 Z" fill="#FFFFFF" opacity="0.12" />
                    <path d="M102 14 C 110 13, 150 12, 186 22 L 186 101 C 150 91, 110 92, 102 92 Z" fill="#FFFFFF" opacity="0.12" />
                    <path d="M100 7 L 100 97" stroke="#075E26" strokeWidth="1.5" opacity="0.35" />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    paddingBottom: '4px'
                  }}>
                    {item.icon}
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '9.5px', fontWeight: '800', color: '#111', lineHeight:'1.1' }}>
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