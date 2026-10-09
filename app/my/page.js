'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const HOT_GREEN = '#00C853'
  const LIGHT_GREEN = '#E8F5E9'

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [avatar, setAvatar] = useState(null)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [repeatPass, setRepeatPass] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, msg: '', type: '' })
  const [showLogout, setShowLogout] = useState(false)

  const [totals, setTotals] = useState({
    balance: 0,
    totalWithdraw: 0,
    totalDeposit: 0,
    totalDaily: 0,
    todayDaily: 0,
    totalCommission: 0
  })

  const normalizePhone = (p) => String(p||'').trim().replace(/\D/g,'')
  const showToast = (msg, type='error') => {
    setToast({ show: true, msg, type })
    setTimeout(()=> setToast({ show:false, msg:'', type:'' }), 2800)
  }
  const getUgandaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })

  useEffect(()=>{
    async function load(){
      try{
        const cached = localStorage.getItem('booksforward_user')
        if(!cached){ router.replace('/login'); return }
        const localUser = JSON.parse(cached)
        const phone = normalizePhone(localUser.phone)
        const savedAvatar = localStorage.getItem(`avatar_${phone}`)
        if(savedAvatar) setAvatar(savedAvatar)

        const res = await fetch(`/api/user?action=getDashboard&phone=${phone}&_t=${Date.now()}`, { cache:'no-store' })
        const data = await res.json()
        let currentUser = localUser
        if(data.success && data.user){
          localStorage.setItem('booksforward_user', JSON.stringify(data.user))
          setUser(data.user); currentUser = data.user
          if(data.user.avatar) setAvatar(data.user.avatar)
        } else setUser(localUser)

        try {
          const txRes = await fetch(`/api/transactions?phone=${phone}&_t=${Date.now()}`, { cache:'no-store' })
          const txData = await txRes.json()
          const list = txData.transactions || []
          let dep=0, wd=0, dailyLifetime=0, todayDaily=0, comm=0
          const ugToday = getUgandaToday()
          list.forEach(t=>{
            const amt = Number(t.amount||0)
            const type = String(t.type||'').toLowerCase().trim()
            const status = String(t.status||'').toLowerCase()
            if(status!=='success' && status!=='completed') return
            let txDate=''
            try{
              const d = t.createdAt ? new Date(t.createdAt) : null
              if(d && !isNaN(d)) txDate = d.toLocaleDateString('en-CA', { timeZone:'Africa/Kampala' })
              else if(typeof t.createdAt==='string') txDate = t.createdAt.slice(0,10)
            }catch{}
            if(type==='deposit' || type.includes('system')) dep+=amt
            else if(type==='withdraw') wd+=amt
            else if(type.includes('daily') || type.includes('book_income')){ dailyLifetime+=amt; if(txDate===ugToday) todayDaily+=amt }
            else if(type.includes('team') || type.includes('commission') || type.includes('invite')) comm+=amt
            else if(type.includes('wheel')){ dailyLifetime+=amt; if(txDate===ugToday) todayDaily+=amt }
          })
          setTotals({ balance:Number(currentUser.availableBalance||0), totalDeposit:dep, totalWithdraw:wd, totalDaily:dailyLifetime, todayDaily, totalCommission:comm })
        }catch{}
      }catch{} finally{ setLoading(false) }
    }
    load()
  },[router])

  const handleFileChange = (e) => {
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result; setAvatar(base64)
      localStorage.setItem(`avatar_${normalizePhone(user?.phone)}`, base64)
      fetch('/api/user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'update', phone: normalizePhone(user?.phone), avatar: base64 }) })
    }
    reader.readAsDataURL(file)
  }

  const getVipValidity = () => {
    if(!user) return ''
    const level = user.vipLevel ?? user.vip ?? 0
    let fromDate = user.vipStartDate ? new Date(user.vipStartDate) : user.createdAt ? new Date(user.createdAt) : new Date()
    let untilDate = new Date(fromDate)
    if(Number(level)===0) untilDate.setDate(untilDate.getDate()+1); else untilDate.setFullYear(untilDate.getFullYear()+1)
    if(user.vipExpiresAt) untilDate = new Date(user.vipExpiresAt)
    const fmt = (d)=>{ const pad=(n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
    return `Vip${level} valid from ${fmt(fromDate)} until ${fmt(untilDate)}`
  }

  const handleSavePassword = async () => {
    if(!oldPass||!newPass||!repeatPass){ showToast('Fill all fields'); return }
    if(newPass!==repeatPass){ showToast('New passwords do not match'); return }
    setSaving(true)
    try{
      const res = await fetch('/api/user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'updatePassword', phone: normalizePhone(user.phone), oldPassword: oldPass, newPassword: newPass }) })
      const data = await res.json()
      if(!data.success) showToast(data.message||'Old password incorrect')
      else { setOldPass(''); setNewPass(''); setRepeatPass(''); showToast('Saved successful','success') }
    }catch{ showToast('Something went wrong') } finally{ setSaving(false) }
  }

  if(loading) return <div style={{padding:'40px', textAlign:'center'}}>Loading...</div>

  const cards = [
    { title:'TOTAL AVAILABLE BALANCE', value: totals.balance },
    { title:'TOTAL WITHDRAW', value: totals.totalWithdraw },
    { title:'TOTAL DEPOSIT', value: totals.totalDeposit },
    { title:'TOTAL DAILY INCOME', value: totals.totalDaily },
    { title:"TODAY'S INCOME", value: totals.todayDaily },
    { title:'TOTAL COMMISSION', value: totals.totalCommission },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#fff' }}>
      <div style={{ background:HOT_GREEN, padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10 }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'none', border:'none', color:'#fff', fontSize:'24px', fontWeight:900, cursor:'pointer' }}>←</button>
        <h1 style={{ margin:0, color:'#fff', fontWeight:900, fontSize:'18px' }}>MY</h1>
      </div>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'20px 16px 100px' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <div onClick={()=>fileInputRef.current?.click()} style={{ width:'92px', height:'92px', borderRadius:'50%', background:'#f2f2f2', border:`2px solid ${HOT_GREEN}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              {avatar ? <img src={avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="avatar" /> : <span style={{fontSize:'36px'}}>👤</span>}
            </div>
            <div onClick={()=>fileInputRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:'28px', height:'28px', background:HOT_GREEN, borderRadius:'50%', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>✏️</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
          <p style={{ margin:'12px 0 4px', fontWeight:900 }}>{user?.username || user?.name || 'User'}</p>
          <p style={{ margin:0, fontSize:'11px', color:'#555', fontWeight:700, textAlign:'center' }}>{getVipValidity()}</p>
        </div>

        <div style={{ marginTop:'22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          {cards.map(c=>(
            <div key={c.title} style={{
              background: LIGHT_GREEN,
              border:'1px solid #C8E6C9',
              borderRadius:'16px',
              padding:'20px 10px',
              aspectRatio:'1 / 1',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              justifyContent:'center',
              textAlign:'center',
            }}>
              <p style={{ margin:'0 0 12px', color:HOT_GREEN, fontSize:'11px', fontWeight:900, lineHeight:'1.2' }}>{c.title}</p>
              <p style={{ margin:0, fontSize:'15px', fontWeight:900, color:'#111' }}>{Number(c.value).toLocaleString()} UGX</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'26px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:900 }}>Modify password</h3>
          {[
            { ph:'Insert old password', v:oldPass, s:setOldPass, sh:showOld, ss:setShowOld },
            { ph:'Insert new password', v:newPass, s:setNewPass, sh:showNew, ss:setShowNew },
            { ph:'Repeat new password', v:repeatPass, s:setRepeatPass, sh:showRepeat, ss:setShowRepeat },
          ].map((f,i)=>(
            <div key={i} style={{ position:'relative', marginBottom:'12px' }}>
              <input type={f.sh?'text':'password'} placeholder={f.ph} value={f.v} onChange={e=>f.s(e.target.value)} style={{ width:'100%', padding:'13px 42px 13px 14px', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' }} />
              <button onClick={()=>f.ss(!f.sh)} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer' }}>{f.sh?'🙈':'👁️'}</button>
            </div>
          ))}
          <button onClick={handleSavePassword} disabled={saving} style={{ width:'100%', background:HOT_GREEN, color:'#fff', border:'none', padding:'13px', borderRadius:'999px', fontWeight:900 }}>{saving?'Saving...':'Save'}</button>
        </div>

        <button onClick={()=>setShowLogout(true)} style={{ marginTop:'30px', width:'100%', background:'#fff', border:'1px solid #ddd', padding:'13px', borderRadius:'999px', fontWeight:900 }}>Logout</button>
      </div>

      {toast.show && <div style={{ position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', background: toast.type==='success'?HOT_GREEN:'#ff4444', color:'#fff', padding:'12px 22px', borderRadius:'999px', fontWeight:800, zIndex:9999 }}>{toast.msg}</div>}
      {showLogout && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#fff', padding:'24px', borderRadius:'16px', width:'85%', maxWidth:'340px', textAlign:'center' }}>
            <p style={{ fontWeight:800, marginBottom:'18px' }}>Are you sure you want to logout?</p>
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={()=>setShowLogout(false)} style={{ flex:1, background:HOT_GREEN, color:'#fff', border:'none', padding:'11px', borderRadius:'999px', fontWeight:900 }}>Cancel</button>
              <button onClick={()=>{ localStorage.removeItem('booksforward_user'); router.replace('/login') }} style={{ flex:1, background:'#ff4444', color:'#fff', border:'none', padding:'11px', borderRadius:'999px', fontWeight:900 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}