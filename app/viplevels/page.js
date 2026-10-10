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

const getUgandaDateStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
const HOT_GREEN = '#00C853'

const Toast = ({ msg, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 1500); return () => clearTimeout(t); }, [onClose]);
  return <div style={{ position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', background:'#000', color:'#fff', padding:'12px 20px', borderRadius:'25px', fontWeight:'700', fontSize:'13px', zIndex:2000 }}>{msg}</div>
}

function VipImage({ level }) {
  return (
    <div style={{ width:90, height:110, flexShrink:0, background:'#FFF', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <img src={`/vip${level}.jpg`} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', mixBlendMode:'multiply' }} />
    </div>
  )
}

export default function VipLevels() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const vips = [{ level:0, price:0 }, { level:1, price:50000 }, { level:2, price:230000 }, { level:3, price:650000 }, { level:4, price:850000 }]

  useEffect(() => {
    const load = async () => {
      const local = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
      if (!local.phone) return
      try {
        const res = await fetch(`/api/viplevels?phone=${local.phone}`)
        const data = await res.json()
        if (data.success && data.user) {
          const fresh = data.user
          const today = getUgandaDateStr()
          if ((fresh.lastResetDate||'') !== today) {
            fresh.books_read_today = '0'
            fresh.dailyIncome = '0'
            fresh.lastResetDate = today
          }
          localStorage.setItem('booksforward_user', JSON.stringify(fresh))
          setUser(fresh)
          return
        }
      } catch {}
      setUser(local)
    }
    load()
  }, [])

  const handleBuyVip = async (vip) => {
    if (!user) return
    const hasBought = user.hasBoughtVip === true || user.hasBoughtVip === 'true'
    const vipActivated = user.vipActivated === true || user.vipActivated === 'true'

    if (vip.level === 0) {
      if (vipActivated) { setToast('Vip0 already activated'); return; }
      if (hasBought) { setToast("Can't downgrade to Vip0"); return; }
    } else {
      if (vip.level <= Number(user.vip || 0) && vipActivated) { setToast('You already have this VIP or higher'); return; }
      if (Number(user.availableBalance || 0) < vip.price) { setToast('Insufficient Available Balance'); return; }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/viplevels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, action: 'UPGRADE', payload: { vipLevel: vip.level } })
      })
      const data = await res.json()
      if (!data.success || !data.user) { setToast(data.message || 'Purchase failed'); return; }
      
      localStorage.setItem('booksforward_user', JSON.stringify(data.user))
      setUser(data.user)
      setToast('Upgraded Successful')
    } catch (err) { 
      setToast('Error: ' + err.message) 
    } finally { 
      setLoading(false) 
    }
  }

  if (!user) return null

  const currentVipLevel = Number(user.vip || 0)
  const hasBought = user.hasBoughtVip === true || user.hasBoughtVip === 'true'
  const vipActivated = user.vipActivated === true || user.vipActivated === 'true'

  const thStyle = { padding:'8px 3px', fontSize:'9.5px', fontWeight:'600', background:HOT_GREEN, border:'1px solid #000', color:'#000', textAlign:'center' }
  const tdStyle = { padding:'7px 3px', fontSize:'9.5px', fontWeight:'400', border:'1px solid #000', color:'#000', textAlign:'center', background:'#fff' }

  return (
    <main style={{ minHeight:'100vh', background:'#FFFFFF', paddingBottom:'90px' }}>
      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
      <div style={{ background:HOT_GREEN, padding:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <Link href="/dashboard" style={{ width:'36px', height:'36px', background:'#FFF', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:HOT_GREEN, fontSize:'20px', fontWeight:'900', textDecoration:'none' }}>←</Link>
        <h1 style={{ color:'#FFF', fontSize:'15px', fontWeight:'900', letterSpacing:'1px' }}>VIP LEVELS</h1>
      </div>

      <div style={{ padding:'12px', maxWidth:'500px', margin:'0 auto' }}>
        <h2 style={{ fontSize:'13px', fontWeight:'900', color:'#000', margin:'12px 0 4px' }}>INCOME TABLE</h2>
        <p style={{ fontSize:'11px', color:'#666', marginBottom:'8px' }}>6 days / 4 weeks / 12 months</p>
        <div style={{ width:'100%', overflowX:'auto', marginBottom:'24px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={{...thStyle, width:'10%'}}>VIP</th><th style={{...thStyle, width:'14%'}}>Price</th><th style={{...thStyle, width:'9%'}}>Tasks</th><th style={{...thStyle, width:'9%'}}>Each</th><th style={{...thStyle, width:'12%'}}>Daily</th><th style={{...thStyle, width:'14%'}}>Weekly</th><th style={{...thStyle, width:'14%'}}>Monthly</th><th style={{...thStyle, width:'18%'}}>Per Year</th>
            </tr></thead>
            <tbody>
              {[0,1,2,3,4].map(lvl=>{
                const v = VIPS[lvl]; const weekly = v.daily * 6; const monthly = weekly * 4; const perYear = monthly * 12; const isVip0 = lvl===0;
                return (
                  <tr key={lvl}>
                    <td style={tdStyle}>V{lvl}</td><td style={tdStyle}>{v.price.toLocaleString()}</td><td style={tdStyle}>{v.books}</td><td style={tdStyle}>{v.perBook.toLocaleString()}</td><td style={tdStyle}>{v.daily.toLocaleString()}</td>
                    <td style={tdStyle}>{isVip0?'-':weekly.toLocaleString()}</td><td style={tdStyle}>{isVip0?'-':monthly.toLocaleString()}</td><td style={tdStyle}>{isVip0?'-':perYear.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display:'flex', flexDirection:'column', maxWidth:'420px', margin:'0 auto' }}>
          {vips.map(vip => {
            // Evaluates active tier states
            const isActiveTier = vipActivated && (currentVipLevel === vip.level);
            const canBuy = vip.level === 0 ? (!vipActivated && !hasBought) : (vip.level > currentVipLevel || !vipActivated);

            return (
              <div key={vip.level} style={{ display:'flex', alignItems:'center', padding:'16px 0', borderBottom:'1px solid #E9E9E9' }}>
                <VipImage level={vip.level} />
                <div style={{ marginLeft:'16px', flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
                    <span style={{ fontWeight:800, fontSize:'15px', color:'#111' }}>{vip.price.toLocaleString()} UGX</span>
                  </div>
                  {isActiveTier ? (
                    <div style={{ width:'100%', background:'#E8E8E8', borderRadius:'10px', padding:'12px 0', fontWeight:'900', fontSize:'14px', textAlign:'center', color:'#111' }}>✅ CURRENT</div>
                  ) : canBuy ? (
                    <button onClick={()=>handleBuyVip(vip)} disabled={loading} style={{ width:'100%', background:HOT_GREEN, color:'#FFFFFF', border:'none', borderRadius:'10px', padding:'12px 0', fontWeight:'900', fontSize:'14px', cursor:'pointer' }}>
                      {loading ? 'PROCESSING...' : 'UPGRADE'}
                    </button>
                  ) : (
                    <div style={{ width:'100%', background:'#E8E8E8', borderRadius:'10px', padding:'12px 0', fontWeight:'900', fontSize:'14px', textAlign:'center', color:'#777' }}>Can't downgrade</div>
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