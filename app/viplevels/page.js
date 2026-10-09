'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export const VIPS = {
  0: { name: 'Vip0', price: 0, books: 5, perBook: 400, daily: 2000, days: 1 },
  1: { name: 'Vip1', price: 50000, books: 5, perBook: 400, daily: 2000, days: 365 },
  2: { name: 'Vip2', price: 230000, books: 10, perBook: 810, daily: 8100, days: 365 },
  3: { name: 'Vip3', price: 650000, books: 15, perBook: 1466, daily: 22000, days: 365 },
  4: { name: 'Vip4', price: 850000, books: 20, perBook: 1500, daily: 30000, days: 365 },
}

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

const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#000', color: '#fff', padding: '12px 20px', borderRadius: '25px',
      fontWeight: '700', fontSize: '13px', zIndex: 2000
    }}>
      {msg}
    </div>
  )
}

function VipImage({ level }) {
  return (
    <div style={{ 
      width: 90, 
      height: 110, 
      position: 'relative', 
      flexShrink: 0,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <img
        src={`/vip${level}.jpg`}
        alt={`VIP${level}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          mixBlendMode: 'multiply',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 62%, transparent 95%)',
          maskImage: 'radial-gradient(ellipse at center, black 62%, transparent 95%)',
        }}
      />
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
    userData.hasBoughtVip = userData.hasBoughtVip || false
    userData.vipActivated = userData.vipActivated || false
    localStorage.setItem('booksforward_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const showToast = (msg) => setToast(msg)

  const handleBuyVip = async (vip) => {
    if (!user) return
    if (vip.level === 0) {
      if (user.vipActivated) { showToast('Vip0 already activated'); return }
      if (user.hasBoughtVip) { showToast("Can't downgrade to Vip0"); return }
    } else {
      if (vip.level <= Number(user.vip) && user.hasBoughtVip) { showToast('You already have this VIP or higher'); return }
      if ((user.availableBalance || 0) < vip.price) { showToast('Insufficient Available Balance'); return }
    }
    setLoading(true)
    try {
      const dateStr = getTodayDateStrFullYear();
      const timeStr = getTodayTimeStrKampala();
      const vipData = VIPS[vip.level];
      const res = await fetch('/api/viplevels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          action: 'UPGRADE',
          payload: {
            vipLevel: vip.level,
            vipName: vip.name,
            price: vip.price,
            books: vipData.books,
            daily: vipData.daily,
            perBook: vipData.perBook,
            dateStr,
            timeStr
          }
        })
      })
      const data = await res.json()
      if (!data.success || !data.user) { showToast(data.message || 'Purchase failed'); setLoading(false); return }
      const updatedUser = { ...data.user }
      localStorage.setItem('booksforward_user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      showToast('Upgraded Successful')
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const currentVipLevel = Number(user.vip || 0)
  const HOT_GREEN = '#00c853'
  const thStyle = { padding: '8px 3px', fontSize: '9.5px', fontWeight: '600', background: HOT_GREEN, border: '1px solid #000', color: '#000', textAlign: 'center' }
  const tdStyle = { padding: '7px 3px', fontSize: '9.5px', fontWeight: '400', border: '1px solid #000', color: '#000', textAlign: 'center', background: '#fff' }

  // Salary table styles (exact 1:1 from your image)
  const salaryTh = { padding: '12px 6px', fontSize: '11px', fontWeight: '700', background: '#00C853', color: '#fff', textAlign: 'center', border: '1px solid #ddd' }
  const salaryTd = { padding: '10px 6px', fontSize: '11px', fontWeight: '500', color: '#000', textAlign: 'center', border: '1px solid #ddd' }
  const salaryTdGray = { ...salaryTd, background: '#f2f2f2' }

  return (
    <main style={{ minHeight: '100vh', background: '#FFFFFF', padding: '0', paddingBottom: '90px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div style={{ background: HOT_GREEN, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard" style={{ width: '36px', height: '36px', background: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: HOT_GREEN, fontSize: '20px', fontWeight: '900', textDecoration: 'none' }}>←</Link>
        <h1 style={{ color: '#FFF', fontSize: '15px', fontWeight: '900', letterSpacing: '1px' }}>VIP LEVELS</h1>
      </div>

      <div style={{ padding: '12px', maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '900', color: '#000', margin: '12px 0 4px' }}>INCOME TABLE</h2>
        <p style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>6 days / 4 weeks / 12 months</p>

        <div style={{ width: '100%', overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{...thStyle, width: '10%'}}>VIP</th>
                <th style={{...thStyle, width: '14%'}}>Price</th>
                <th style={{...thStyle, width: '9%'}}>Tasks</th>
                <th style={{...thStyle, width: '9%'}}>Each</th>
                <th style={{...thStyle, width: '12%'}}>Daily</th>
                <th style={{...thStyle, width: '14%'}}>Weekly</th>
                <th style={{...thStyle, width: '14%'}}>Monthly</th>
                <th style={{...thStyle, width: '18%'}}>Per Year</th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4].map(lvl => {
                const v = VIPS[lvl]
                const isVip0 = lvl === 0
                const weekly = v.daily * 6
                const monthly = weekly * 4
                const perYear = monthly * 12
                return (
                  <tr key={lvl}>
                    <td style={tdStyle}>V{lvl}</td>
                    <td style={tdStyle}>{v.price.toLocaleString()}</td>
                    <td style={tdStyle}>{v.books}</td>
                    <td style={tdStyle}>{v.perBook.toLocaleString()}</td>
                    <td style={tdStyle}>{v.daily.toLocaleString()}</td>
                    <td style={tdStyle}>{isVip0 ? '-' : weekly.toLocaleString()}</td>
                    <td style={tdStyle}>{isVip0 ? '-' : monthly.toLocaleString()}</td>
                    <td style={tdStyle}>{isVip0 ? '-' : perYear.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* SALARY TABLE 1:1 EXACT FROM YOUR IMAGE */}
        <div style={{ width: '100%', overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={salaryTh}>POSITION</th>
                <th style={salaryTh}>NUMBER OF MEMBERS</th>
                <th style={salaryTh}>TEAM COUNT</th>
                <th style={salaryTh}>SALARY</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={salaryTd}>Trainee</td><td style={salaryTd}>8</td><td style={salaryTd}>ABC</td><td style={{...salaryTd, fontWeight: '700'}}>90,000shs</td></tr>
              <tr><td style={salaryTdGray}>Team Trainee</td><td style={salaryTdGray}>16</td><td style={salaryTdGray}>ABC</td><td style={{...salaryTdGray, fontWeight: '700'}}>170,000shs</td></tr>
              <tr><td style={salaryTd}>Team Leader</td><td style={salaryTd}>25</td><td style={salaryTd}>ABC</td><td style={{...salaryTd, fontWeight: '700'}}>260,000shs</td></tr>
              <tr><td style={salaryTdGray}>Team Manager</td><td style={salaryTdGray}>40</td><td style={salaryTdGray}>ABC</td><td style={{...salaryTdGray, fontWeight: '700'}}>420,000shs</td></tr>
              <tr><td style={salaryTd}>Regional Supervisor</td><td style={salaryTd}>80</td><td style={salaryTd}>ABC</td><td style={{...salaryTd, fontWeight: '700'}}>820,000shs</td></tr>
              <tr><td style={salaryTdGray}>Manager</td><td style={salaryTdGray}>150</td><td style={salaryTdGray}>ABC</td><td style={{...salaryTdGray, fontWeight: '700'}}>1,600,000shs</td></tr>
              <tr><td style={salaryTd}>General Manager</td><td style={salaryTd}>400</td><td style={salaryTd}>ABC</td><td style={{...salaryTd, fontWeight: '700'}}>4,200,000shs</td></tr>
              <tr><td style={salaryTdGray}>Marketing Manager</td><td style={salaryTdGray}>600</td><td style={salaryTdGray}>ABC</td><td style={{...salaryTdGray, fontWeight: '700'}}>6,200,000shs</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0 4px', marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: '800', color: '#00C853', marginBottom: '6px' }}>SALARY QUALIFICATION GUIDELINES</p>
          <p style={{ fontSize: '11px', color: '#000', lineHeight: '1.5', marginBottom: '8px' }}>
            To qualify for the salary attached to each position, you must maintain a well-balanced ABC team.
          </p>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#000', marginBottom: '4px' }}>Requirement:</p>
          <ul style={{ margin: '0 0 10px 16px', padding: 0 }}>
            <li style={{ fontSize: '11px', color: '#000', lineHeight: '1.6', listStyle: 'disc' }}>40% of members must be on your current VIP level</li>
            <li style={{ fontSize: '11px', color: '#000', lineHeight: '1.6', listStyle: 'disc' }}>60% of members must be on any VIP level above your current VIP level</li>
          </ul>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#00C853', marginBottom: '4px' }}>Payment Schedule:</p>
          <p style={{ fontSize: '11px', color: '#000', lineHeight: '1.5', marginBottom: '8px' }}>
            All qualified salaries are paid on the <span style={{ color: '#00C853', fontWeight: '800' }}>15th</span> of each month.
          </p>
          <p style={{ fontSize: '11px', color: '#000', lineHeight: '1.5' }}>
            If you meet these requirements, please contact the Hiring Manager to be registered on the company's monthly payroll.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px', margin: '0 auto' }}>
          {vips.map(vip => {
            const isCurrent = currentVipLevel === vip.level && (vip.level===0 ? user.vipActivated : true)
            let canBuy = false
            if(vip.level===0){
              canBuy = !user.vipActivated && !user.hasBoughtVip
            } else {
              if(!user.hasBoughtVip){
                canBuy = true
              } else {
                canBuy = vip.level > currentVipLevel
              }
            }
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
                <VipImage level={vip.level} />
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
                    <div style={{ width: '100%', background: '#f2f2f2', borderRadius: '10px', padding: '11px 0', fontWeight: '900', fontSize: '14px', textAlign: 'center' }}>Can't downgrade</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}