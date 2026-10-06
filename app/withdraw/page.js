'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const HOT_GREEN = '#00c853'
const WITHDRAW_AMOUNTS = [10000, 50000, 150000, 350000, 550000, 700000, 1100000, 3000000]

const getUgandaTime = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" }))
const isWithdrawalWindowOpen = () => {
  const now = getUgandaTime()
  const day = now.getDay() // 0 Sun, 6 Sat
  if (day === 0 || day === 6) return { open: false, reason: 'weekend' }
  const totalSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds()
  const openSec = 11*3600 // 11:00:00 exactly
  const closeSec = 18*3600 // 18:00:00 exactly
  if (totalSec < openSec || totalSec >= closeSec) return { open: false, reason: 'time' }
  return { open: true }
}

const Toast = ({ msg, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#000', color: '#fff', padding: '12px 22px', borderRadius: '25px', fontWeight: '700', fontSize: '13px', zIndex: 9999, maxWidth: '90%', textAlign: 'center' }}>{msg}</div>
}

function AtmCard({ type, form, setForm }) {
  const bg = type === 'MTN'? '#00c853' : '#E10600'
  return (
    <div style={{ background: bg, borderRadius: '18px', padding: '18px', marginTop: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <span style={{ color: '#fff', fontWeight: '900', fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '20px' }}>{type}</span>
        <span style={{ color: '#000', fontWeight: '900', fontSize: '20px', fontFamily: 'serif' }}>BF</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>Receipt Names:</label>
          <input value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value })} placeholder="Enter full names" style={{ width: '100%', marginTop: '5px', padding: '12px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '600', outline: 'none' }} />
        </div>
        <div>
          <label style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>Receipt phone number:</label>
          <input value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="07XXXXXXXX" style={{ width: '100%', marginTop: '5px', padding: '12px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '600', outline: 'none' }} />
        </div>
      </div>
    </div>
  )
}

export default function Withdraw() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [method, setMethod] = useState('')
  const [form, setForm] = useState({ phoneNumber: '', accountName: '', amount: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [timeAllowed, setTimeAllowed] = useState(true)
  const [ugTime, setUgTime] = useState('')

  const showToast = (m) => setToast(m)

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!localUser.phone) return router.push('/login')
    fetch(`/api/admin?action=user&phone=${localUser.phone}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) { setUser(data.user); localStorage.setItem('booksforward_user', JSON.stringify(data.user)) }
        else setUser(localUser)
      }).catch(() => setUser(localUser))

    const check = () => {
      const res = isWithdrawalWindowOpen()
      setTimeAllowed(res.open)
      setUgTime(getUgandaTime().toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' }))
    }
    check()
    const iv = setInterval(check, 1000) // exact 11:00:00 open, 18:00:00 close
    return () => clearInterval(iv)
  }, [router])

  const handleWithdraw = async () => {
    const windowCheck = isWithdrawalWindowOpen()
    if (windowCheck.reason === 'weekend') return showToast('No withdraw on weekends! Monday to Friday only.')
    if (!windowCheck.open) return showToast('Withdrawals only open 11:00 AM - 6:00 PM Ugandan Time.')

    if (!method) return showToast('Select MTN or AIRTEL network first')
    if (!form.phoneNumber ||!/^07\d{8}$/.test(form.phoneNumber)) return showToast('Invalid number - use 07XXXXXXXX')
    if (!form.accountName.trim()) return showToast("Input holder's names")
    if (!form.amount) return showToast('Select amount')

    const amt = Number(form.amount.replace(/,/g, ''))
    if (!WITHDRAW_AMOUNTS.includes(amt)) return showToast('Invalid amount - select from list')
    if (amt > Number(user.availableBalance || 0)) return showToast('Insufficient balance')

    // once per day check
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
    const history = JSON.parse(localStorage.getItem(`lastWithdraw_${user.phone}`) || '""')
    if (history === today) return showToast('Withdraw limited to once per day')

    setLoading(true)
    const amountAfterFee = amt * 0.9

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'withdraw',
          phone: user.phone,
          amount: amountAfterFee,
          method: method === 'MTN'? 'MTN MOBILE MONEY' : 'AIRTEL MOBILE MONEY',
          withdrawPhone: form.phoneNumber,
          withdrawName: form.accountName
        })
      })
      const data = await res.json()
      if (!res.ok) return showToast(data.error || 'Withdrawal failed')

      const updatedUser = {...user, availableBalance: Number(user.availableBalance || 0) - amt }
      setUser(updatedUser)
      localStorage.setItem('booksforward_user', JSON.stringify(updatedUser))
      localStorage.setItem(`lastWithdraw_${user.phone}`, JSON.stringify(today))

      showToast('Withdraw success - Pending admin approval')
      setTimeout(() => router.push('/transactions'), 1200)
    } catch {
      showToast('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="p-4 text-black font-bold">Loading...</div>

  return (
    <main style={{ minHeight: '100vh', background: '#fff', paddingBottom: '90px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* GREEN HEADER */}
      <div style={{ background: HOT_GREEN, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard" style={{ width: '36px', height: '36px', background: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: HOT_GREEN, fontSize: '20px', fontWeight: '900', textDecoration: 'none' }}>←</Link>
        <h1 style={{ color: '#FFF', fontSize: '15px', fontWeight: '900', letterSpacing: '1px' }}>WITHDRAW</h1>
        <span style={{ marginLeft: 'auto', color: '#fff', fontSize: '10px', fontWeight: '700' }}>{ugTime} UGA</span>
      </div>

      <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>

        {/* YELLOW NETWORK CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div onClick={() => setMethod('MTN')} style={{ background: method === 'MTN'? '#FFEB3B' : '#FFF9C4', border: method === 'MTN'? '2px solid #000' : '1px solid #f0e68c', borderRadius: '14px', padding: '18px 12px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontWeight: '900', fontSize: '14px', color: '#000' }}>MTN NETWORK</div>
            <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '700', color: '#555' }}>Tap to select</div>
          </div>
          <div onClick={() => setMethod('AIRTEL')} style={{ background: method === 'AIRTEL'? '#FFEB3B' : '#FFF9C4', border: method === 'AIRTEL'? '2px solid #000' : '1px solid #f0e68c', borderRadius: '14px', padding: '18px 12px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontWeight: '900', fontSize: '14px', color: '#E10600' }}>AIRTEL NETWORK</div>
            <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '700', color: '#555' }}>Tap to select</div>
          </div>
        </div>

        {method && <AtmCard type={method} form={form} setForm={setForm} />}

        {method && (
          <>
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '900', marginBottom: '10px', color: '#000' }}>Select Amount (UGX)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {WITHDRAW_AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => setForm({...form, amount: amt.toString() })} style={{ padding: '14px', borderRadius: '12px', border: form.amount === amt.toString()? '2px solid #000' : '1px solid #e0e0e0', background: form.amount === amt.toString()? HOT_GREEN : '#fff', color: form.amount === amt.toString()? '#fff' : '#000', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <input type="text" placeholder="e.g. 10000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '12px', fontWeight: '700', fontSize: '13px', outline: 'none' }} />
            </div>
          </>
        )}

        {/* NOTE */}
        <div style={{ marginTop: '22px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontWeight: '900', fontSize: '12px', marginBottom: '8px' }}>Note:</div>
          <div style={{ fontSize: '11px', lineHeight: '18px', color: '#444' }}>
            Minimum withdraw: <b>10,000ugx</b><br />
            Transaction fee: <b>10%</b><br />
            Withdraw days : <b>Monday to Friday.</b><br />
            Withdraw time: <b>11:00am to 6:00pm.</b><br />
            Funds will arrive in your mobile money wallet with 30minutes to 24hours max.
          </div>
          {!timeAllowed && <div style={{ marginTop: '10px', color: '#E10600', fontSize: '11px', fontWeight: '800' }}>⚠️ Closed now - Opens exactly 11:00am, closes exactly 6:00pm Uganda. Now: {ugTime}</div>}
        </div>

        <button onClick={handleWithdraw} disabled={loading ||!timeAllowed} style={{ width: '100%', marginTop: '20px', background:!timeAllowed? '#ccc' : HOT_GREEN, color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontWeight: '900', fontSize: '14px', letterSpacing: '1px', cursor:!timeAllowed || loading? 'not-allowed' : 'pointer' }}>
          {loading? 'PROCESSING...' :!timeAllowed? 'WITHDRAW CLOSED' : 'SUBMIT TRANSACTION'}
        </button>
      </div>
    </main>
  )
}