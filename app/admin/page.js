'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const P = 'bf:'
const getUgandaDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
const getUgandaDateTime = () => new Date().toLocaleString('en-CA', { timeZone: 'Africa/Kampala', hour12: false }).replace(',', '').slice(0,19)

export default function Admin() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('deposit')
  const [depositHistory, setDepositHistory] = useState([])
  const [withdrawHistory, setWithdrawHistory] = useState([])
  const [searchPhone, setSearchPhone] = useState('')
  const [foundUser, setFoundUser] = useState(null)
  const [showResetBox, setShowResetBox] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [depositPhone, setDepositPhone] = useState('')
  const [depositFoundUser, setDepositFoundUser] = useState(null)
  const [showDepositBox, setShowDepositBox] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  const ADMIN_PHONE = '0753520252'

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (localUser.phone!== ADMIN_PHONE) { router.push('/dashboard'); return }
    setUser(localUser)
    loadPending()
    loadHistories()
  }, [])

  const loadPending = async () => {
    const res = await fetch('/api/admin?action=pending')
    const data = await res.json()
    if (data.success) setPending(data.pending)
    setLoading(false)
  }

  const loadHistories = async () => {
    const today = getUgandaDate()
    // 1. localStorage (instant)
    const dLocal = JSON.parse(localStorage.getItem(`${P}admin_deposit_history`) || '[]').filter(h => h.date === today)
    const wLocal = JSON.parse(localStorage.getItem(`${P}admin_withdraw_history`) || '[]').filter(h => h.date === today)

    // 2. Redis backend (with hour-minute-second + auto 24hr expire)
    try {
      const [dRes, wRes] = await Promise.all([
        fetch('/api/admin?action=deposit_history').then(r=>r.json()).catch(()=>({history:[]})),
        fetch('/api/admin?action=withdraw_history').then(r=>r.json()).catch(()=>({history:[]}))
      ])
      const dRedis = (dRes.history||[]).map(tx => ({
        phone: tx.phone,
        amount: tx.amount,
        status: tx.status,
        date: tx.createdAt?.slice(0,10) || today,
        timestamp: tx.updatedAt || tx.createdAt, // YYYY-MM-DD HH:mm:ss
        createdAt: tx.createdAt,
        withdrawPhone: tx.withdrawPhone,
        method: tx.method
      }))
      const wRedis = (wRes.history||[]).map(tx => ({
        phone: tx.phone,
        amount: tx.amount,
        status: tx.status,
        date: tx.createdAt?.slice(0,10) || today,
        timestamp: tx.updatedAt || tx.createdAt,
        createdAt: tx.createdAt,
        withdrawPhone: tx.withdrawPhone,
        withdrawName: tx.withdrawName,
        method: tx.method
      }))
      // merge redis + local, dedup
      setDepositHistory([...dRedis,...dLocal].slice(0,50))
      setWithdrawHistory([...wRedis,...wLocal].slice(0,50))
    } catch {
      setDepositHistory(dLocal)
      setWithdrawHistory(wLocal)
    }
  }

  const saveToHistory = (type, entry) => {
    const today = getUgandaDate()
    const key = type === 'deposit'? `${P}admin_deposit_history` : `${P}admin_withdraw_history`
    const all = JSON.parse(localStorage.getItem(key) || '[]')
    const newEntry = {...entry, date: today, timestamp: entry.createdAt || getUgandaDateTime() }
    const updated = [newEntry,...all.filter(h => h.date === today)].slice(0,100)
    localStorage.setItem(key, JSON.stringify([...updated,...all.filter(h => h.date!== today)]))
    loadHistories()
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleAction = async (tx, action) => {
    const isDeposit = String(tx.type).toLowerCase().trim()!== 'withdraw'
    setPending(prev => prev.filter(t => t.id!== tx.id))
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateStatus', id: tx.id, status: action, phone: tx.phone })
    })
    const data = await res.json()
    if (data.success) {
      showToast(`Transaction ${action}`)
      if (isDeposit) {
        saveToHistory('deposit', { phone: tx.phone, amount: tx.amount, status: action, createdAt: getUgandaDateTime() })
      } else {
        saveToHistory('withdraw', {
          phone: tx.phone, amount: tx.amount,
          withdrawPhone: tx.withdrawPhone || tx.phoneNumber || '',
          withdrawName: tx.withdrawName || tx.accountName || '',
          method: tx.method || '', status: action, createdAt: getUgandaDateTime()
        })
      }
      setTimeout(loadHistories, 500)
    } else { showToast(data.error); loadPending() }
  }

  const searchUser = async () => {
    if (!/^07\d{8}$/.test(searchPhone)) return showToast('Enter valid phone')
    const res = await fetch(`/api/admin?action=user&phone=${searchPhone}`)
    const data = await res.json()
    if (data.success) setFoundUser(data.user)
    else { showToast('User not found'); setFoundUser(null) }
  }

  const searchDepositUser = async () => {
    if (!/^07\d{8}$/.test(depositPhone)) return showToast('Enter valid phone')
    const res = await fetch(`/api/admin?action=user&phone=${depositPhone}`)
    const data = await res.json()
    if (data.success) { setDepositFoundUser(data.user); setShowDepositBox(false) }
    else { showToast('User not found'); setDepositFoundUser(null) }
  }

  const resetPassword = async () => {
    if (!/^[a-zA-Z0-9]{6}$/.test(tempPassword)) return showToast('Password must be 6 letters/numbers')
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetPassword', phone: searchPhone, password: tempPassword })
    })
    const data = await res.json()
    if (data.success) { showToast('Password reset: ' + tempPassword); setShowResetBox(false); setTempPassword('') }
    else showToast(data.error)
  }

  const handleAdminDeposit = async () => {
    const amt = Number(depositAmount.replace(/,/g, ''))
    if (!amt || amt <= 0) return showToast('Enter amount')
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminDeposit', phone: depositPhone, amount: amt })
    })
    const data = await res.json()
    if (data.success) {
      showToast(`Deposited ${amt} to ${depositPhone}`)
      setDepositFoundUser(data.user)
      saveToHistory('deposit', { phone: depositPhone, amount: amt, status: 'system increase', createdAt: getUgandaDateTime() })
      setShowDepositBox(false); setDepositAmount('')
      setTimeout(loadHistories, 500)
    } else showToast(data.error)
  }

  if (!user) return <div className="p-4 text-black font-bold">Loading...</div>

  const depositPending = pending.filter(tx => String(tx.type).toLowerCase().trim()!== 'withdraw')
  const withdrawPending = pending.filter(tx => String(tx.type).toLowerCase().trim() === 'withdraw')

  return (
    <div className="min-h-screen bg-white p-4 pb-24 max-w-[600px] mx-auto">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-black text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">{toast}</div>}

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/dashboard')} className="text-2xl text-black">←</button>
        <h1 className="text-2xl font-black text-black">Admin Panel</h1>
        <span className="ml-auto text-[10px] font-bold font-mono">{getUgandaDateTime()} UGA</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => setActiveTab('deposit')} className={`py-3 rounded-xl font-black text-sm border-2 ${activeTab==='deposit'?'bg-[#00c853] text-white border-black':'bg-yellow-200 text-black border-gray-300'}`}>
          DEPOSIT PENDING ({depositPending.length})
        </button>
        <button onClick={() => setActiveTab('withdraw')} className={`py-3 rounded-xl font-black text-sm border-2 ${activeTab==='withdraw'?'bg-[#00c853] text-white border-black':'bg-yellow-200 text-black border-gray-300'}`}>
          WITHDRAW PENDING ({withdrawPending.length})
        </button>
      </div>

      {activeTab==='deposit' && (
        <div className="mb-8">
          <h2 className="text-[13px] font-black mb-2">Deposit Pending</h2>
          {loading? <p className="text-black">Loading...</p> : depositPending.length===0? <p className="text-gray-500 text-sm">No deposit pending</p> : (
            <div className="flex flex-col gap-3">
              {depositPending.map(tx => (
                <div key={tx.id} className="border rounded-xl p-3 bg-gray-50">
                  <p className="font-black text-sm border-b pb-1 mb-1">{tx.type.toUpperCase()} - {Number(tx.amount).toLocaleString()} shs</p>
                  <p className="text-xs font-bold">User: <span className="font-black">{tx.phone}</span></p>
                  <p className="text-xs font-bold">Method: {tx.method}</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">{tx.createdAt}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleAction(tx,'success')} className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold">Approve</button>
                    <button onClick={() => handleAction(tx,'failed')} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 bg-[#FFF9C4] border rounded-xl p-3">
            <h3 className="font-black text-xs mb-2">Deposit History Today (auto clears 24hrs) - YYYY-MM-DD HH:mm:ss</h3>
            {depositHistory.length===0? <p className="text-[11px] text-gray-500">No history today</p> : depositHistory.map((h,i) => (
              <div key={i} className="flex justify-between border-b py-2 text-[11px]">
                <div>
                  <p className="font-black">{h.phone} - {Number(h.amount).toLocaleString()} shs</p>
                  <p className={`font-bold ${h.status==='success'?'text-green-600':h.status==='failed'?'text-red-600':'text-blue-600'}`}>{h.status.toUpperCase()}</p>
                  <p className="text-[10px] text-black font-mono font-bold">🕒 {h.createdAt || h.timestamp} </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='withdraw' && (
        <div className="mb-8">
          <h2 className="text-[13px] font-black mb-2">Withdraw Pending</h2>
          {loading? <p className="text-black">Loading...</p> : withdrawPending.length===0? <p className="text-gray-500 text-sm">No withdraw pending</p> : (
            <div className="flex flex-col gap-3">
              {withdrawPending.map(tx => (
                <div key={tx.id} className="border rounded-xl p-3 bg-gray-50">
                  <p className="font-black text-sm border-b pb-1 mb-1">WITHDRAW - {Number(tx.amount).toLocaleString()} shs</p>
                  <div className="flex flex-col gap-1 text-xs font-bold">
                    <p>Phone: <span className="font-black">{tx.phone}</span></p>
                    <p>Target No: <span className="text-blue-600">{tx.withdrawPhone || tx.phoneNumber}</span></p>
                    <p>Account Name: {tx.withdrawName || tx.accountName}</p>
                    <p>Network: {tx.method}</p>
                    <p className="text-[10px] font-normal text-gray-500 font-mono">{tx.createdAt}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleAction(tx,'success')} className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold">Approve</button>
                    <button onClick={() => handleAction(tx,'failed')} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 bg-[#FFEBEE] border rounded-xl p-3">
            <h3 className="font-black text-xs mb-2">Withdraw History Today (auto clears 24hrs) - YYYY-MM-DD HH:mm:ss</h3>
            {withdrawHistory.length===0? <p className="text-[11px] text-gray-500">No history today</p> : withdrawHistory.map((h,i) => (
              <div key={i} className="border-b py-2 text-[11px]">
                <p className="font-black">{h.phone} - {Number(h.amount).toLocaleString()} shs - {h.status.toUpperCase()}</p>
                <p>Account: {h.withdrawPhone || h.phone} | Target: {h.withdrawPhone} | Network: {h.method}</p>
                <p>Amount: {Number(h.amount).toLocaleString()} | Status: {h.status}</p>
                <p className="text-[10px] text-black font-mono font-bold mt-1">🕒 {h.createdAt || h.timestamp}</p>
                <p className="text-[10px] text-gray-500 font-mono">📅 {h.date} Uganda Calendar</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 border-2 border-black rounded-xl bg-white">
        <h2 className="text-sm font-black mb-3">ADMIN DEPOSIT TO USER</h2>
        <div className="flex gap-2 mb-3">
          <input type="tel" placeholder="07XXXXXXXX" value={depositPhone} onChange={e=>setDepositPhone(e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10} className="flex-1 border rounded-lg px-3 py-2 text-black outline-none" />
          <button onClick={searchDepositUser} className="px-4 py-2 bg-black text-white rounded-lg font-bold">🔍</button>
        </div>
        {depositFoundUser && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-xs"><b>Username:</b> {depositFoundUser.username}</p>
            <p className="text-xs"><b>Phone:</b> {depositFoundUser.phone}</p>
            <p className="text-xs"><b>Password:</b> {depositFoundUser.password}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs"><b>Balance:</b> {Number(depositFoundUser.availableBalance||0).toLocaleString()} shs</p>
              <button onClick={()=>setShowDepositBox(true)} className="ml-2 px-3 py-1 bg-[#00c853] text-white rounded-full text-[11px] font-bold">deposit</button>
            </div>
            {showDepositBox && (
              <div className="mt-3 bg-white border rounded-lg p-3">
                <input type="tel" placeholder="Insert amount" value={depositAmount} onChange={e=>setDepositAmount(e.target.value.replace(/\D/g,''))} className="w-full border rounded-lg px-3 py-2 text-black mb-2 outline-none" />
                <button onClick={handleAdminDeposit} className="w-full py-2 bg-[#00c853] text-white rounded-lg font-bold text-sm">Deposit Money</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-black mb-3">Password Reset</h2>
        <div className="flex gap-2 mb-3">
          <input type="tel" placeholder="07XXXXXXXX" value={searchPhone} onChange={e=>setSearchPhone(e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10} className="flex-1 border rounded-lg px-3 py-2 text-black bg-white outline-none" />
          <button onClick={searchUser} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold">🔍</button>
        </div>
        {foundUser && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-xs mb-1"><b>Username:</b> {foundUser.username}</p>
            <p className="text-xs mb-1"><b>Phone:</b> {foundUser.phone}</p>
            <p className="text-xs mb-2"><b>Password:</b> {foundUser.password}</p>
            <button onClick={()=>setShowResetBox(true)} className="mt-1 px-4 py-2 bg-yellow-500 text-black rounded-lg font-bold text-xs">Reset Password</button>
            {showResetBox && (
              <div className="mt-3 p-3 bg-white border rounded-lg">
                <input type="text" placeholder="New temp password 6 chars" value={tempPassword} onChange={e=>setTempPassword(e.target.value)} maxLength={6} className="w-full border rounded-lg px-3 py-2 text-black mb-3 outline-none" />
                <button onClick={resetPassword} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs">Confirm Reset</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}