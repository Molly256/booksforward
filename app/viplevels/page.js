'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const getTodayDateStrFullYear = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" }));
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const getTodayTimeStrKampala = () => {
  return new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0,16).replace(',', ' ');
}

const isWeekendUganda = () => {
  const ugandaTimeString = new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" })
  const ugandaDate = new Date(ugandaTimeString)
  const day = ugandaDate.getDay()
  return day === 0 || day === 6
}

const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: '#000', color: '#fff', padding: '14px 22px', borderRadius: '12px',
      fontWeight: '900', fontSize: '15px', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
    }}>
      {msg}
    </div>
  )
}

function VipBadge({ color, label, textColor }) {
  return (
    <div style={{ width: 88, height: 116, position: 'relative', flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0 }}>
        <path d="M50 0 L53.5 7.5 L61 2 L63 10 L71 5.5 L71 13.5 L79.5 10.5 L78 18.5 L86 17 L83 25 L90.5 25.5 L86 33 L92.5 35 L87 42 L92 46 L86 52 L90 59 L83 62 L86 70 L78 71.5 L79.5 79.5 L71 79 L71 87 L63 83 L61 91 L53.5 85.5 L50 93 L46.5 85.5 L39 91 L37 83 L29 87 L29 79 L20.5 79.5 L22 71.5 L14 70 L17 62 L10 59 L14 52 L8 46 L13 42 L7.5 35 L14 33 L9.5 25.5 L17 25 L14 17 L22 18.5 L20.5 10.5 L29 13.5 L29 5.5 L37 10 L39 2 Z" fill={color} />
        <circle cx="50" cy="46.5" r="32" fill="white" opacity="0.18" />
        <circle cx="50" cy="46.5" r="27" fill={color} style={{ filter: 'brightness(0.92)' }} />
        <ellipse cx="50" cy="33" rx="14" ry="6" fill="white" opacity="0.22" />
      </svg>
      <div style={{ position: 'absolute', top: '25px', left: 0, width: '88px', textAlign: 'center', color: textColor, fontWeight: 900, fontSize: '15px', fontFamily: 'serif', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '2px', marginTop: '76px', justifyContent: 'center' }}>
        <div style={{ width: 25, height: 46, background: color, clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)', transform: 'rotate(7deg)' }}/>
        <div style={{ width: 25, height: 46, background: color, clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)', transform: 'rotate(-7deg)' }}/>
      </div>
    </div>
  )
}

export default function VipLevels() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const vips = [
    { level: 0, name: 'Vip0', price: 0, color: '#FF4F00', textColor: '#FFFFFF' },
    { level: 1, name: 'Vip1', price: 50000, color: '#E10600', textColor: '#FFFFFF' },
    { level: 2, name: 'Vip2', price: 230000, color: '#0066FF', textColor: '#FFFFFF' },
    { level: 3, name: 'Vip3', price: 650000, color: '#00A63D', textColor: '#FFFFFF' },
    { level: 4, name: 'Vip4', price: 850000, color: '#E6A000', textColor: '#000000' },
  ]

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!userData.phone) return
    const today = new Date().toISOString().split('T')[0]
    const lastReset = userData.lastResetDate || ''
    if (lastReset !== today) {
      userData.books_read_today = 0
      userData.dailyIncome = 0
      userData.lastResetDate = today
    }
    userData.vip = Number(userData.vip || 0)
    userData.availableBalance = Number(userData.availableBalance || 0)
    userData.vipPricePaid = Number(userData.vipPricePaid || 0)
    userData.dailyIncome = Number(userData.dailyIncome || 0)
    userData.books_read_today = Number(userData.books_read_today || 0)
    userData.unlockedBooks = userData.unlockedBooks || []
    userData.completedBooks = userData.completedBooks || []
    localStorage.setItem('booksforward_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const showToast = (msg) => setToast(msg)

  const handleBuyVip = async (vip) => {
    if (!user) return
    if (vip.level <= Number(user.vip)) {
      showToast('You already have this VIP or higher')
      return
    }
    if ((user.availableBalance || 0) < vip.price) {
      showToast('Insufficient Available Balance')
      return
    }
    setLoading(true)
    try {
      const dateStr = getTodayDateStrFullYear();
      const timeStr = getTodayTimeStrKampala();
      const isWeekend = isWeekendUganda(); 
      const res = await fetch('/api/viplevels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          action: 'BUY_VIP',
          payload: {
            vipLevel: vip.level,
            vipName: vip.name,
            price: vip.price,
            books: 4,
            dateStr, 
            timeStr, 
            assignBooks: !isWeekend 
          }
        })
      })
      const data = await res.json()
      if (!data.success || !data.user) {
        showToast(data.message || 'Purchase failed')
        setLoading(false)
        return
      }
      const updatedUser = { ...data.user }
      localStorage.setItem('booksforward_user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      showToast(isWeekend ? 'VIP Buy Successful - Books unlock on Monday' : 'VIP Buy Successful') 
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const currentVipLevel = Number(user.vip || 0)

  return (
    <main style={{ minHeight: '100vh', background: '#FFFFFF', padding: '20px', paddingBottom: '90px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <Link href="/dashboard" style={{ fontSize: '16px', color: '#FF4F00', fontWeight: '900', textDecoration: 'none' }}>
          ← Back
        </Link>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontWeight: '900', color: '#000', fontSize: '14px' }}>
            Balance: {user.availableBalance?.toLocaleString() || 0} UGX
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: '700', color: '#000' }}>
            {vips.find(v => v.level === currentVipLevel)?.name || 'Vip0'}
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '22px', color: '#000', textAlign: 'center', letterSpacing: '1px' }}>VIP LEVELS</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px', margin: '0 auto' }}>
        {vips.map(vip => {
          const isCurrent = currentVipLevel === vip.level
          const isOwned = currentVipLevel >= vip.level
          const canBuy = vip.level > currentVipLevel

          return (
            <div key={vip.level} style={{
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}>
              <VipBadge color={vip.color} label={`VIP${vip.level}`} textColor={vip.textColor} />

              <div style={{ marginLeft: '16px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 900, fontSize: '16px', color: '#111' }}>{vip.name}</span>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#111' }}>{vip.price.toLocaleString()} UGX</span>
                </div>

                {canBuy ? (
                  <button
                    onClick={() => handleBuyVip(vip)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: vip.color,
                      color: vip.textColor,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px 0',
                      fontWeight: '900',
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: `0 4px 12px ${vip.color}55`,
                    }}
                  >
                    UPGRADE
                  </button>
                ) : isCurrent ? (
                  <div style={{ width: '100%', background: '#f2f2f2', borderRadius: '10px', padding: '11px 0', fontWeight: '900', fontSize: '14px', textAlign: 'center' }}>✅ CURRENT</div>
                ) : (
                  <div style={{ width: '100%', background: '#f2f2f2', borderRadius: '10px', padding: '11px 0', fontWeight: '900', fontSize: '14px', textAlign: 'center' }}>Owned</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}