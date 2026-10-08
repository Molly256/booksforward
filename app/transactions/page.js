'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const HOT_GREEN = '#00C853'
const TABS = ['All', 'Deposit', 'Withdraw', 'Daily income']

const TYPE_MAP = {
  'vip': 'viplevel purchase',
  'buy_vip': 'viplevel purchase',
  'upgrade': 'viplevel purchase',
  'upgrade_vip': 'viplevel purchase',
  'viplevel': 'viplevel purchase',
  'viplevel purchase': 'viplevel purchase',
  'viplevel_purchase': 'viplevel purchase',
  'refund_vip': 'refund', 'refund': 'refund',
  'deposit': 'deposit', 'system increase': 'deposit', 'system_increase': 'deposit',
  'withdraw': 'withdraw',
  'daily income': 'daily income', 'daily_income': 'daily income', 'book_income': 'daily income',
  'wheel': 'magical wheel', 'lucky wheel': 'magical wheel', 'magical wheel': 'magical wheel',
  'commission': 'team', 'team': 'team', 'myteam': 'team', 'invite': 'team',
  'team_a_payout': 'team', 'team_b_payout': 'team', 'team_c_payout': 'team',
}
const toTabKey = (t) => TYPE_MAP[String(t||'').toLowerCase().trim()] || String(t||'').toLowerCase().replace(/_/g,' ').trim()

function formatUgDateParts(input) {
  if (!input) return { date: '', time: '' }
  let d
  if (/^\d{10,13}$/.test(String(input).trim())) d = new Date(Number(input))
  else d = new Date(input)
  if (isNaN(d.getTime())) return { date: String(input).slice(0,10), time: String(input).slice(11,19) }
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const m = {}
  fmt.formatToParts(d).forEach(p=>m[p.type]=p.value)
  return { date: `${m.year}-${m.month}-${m.day}`, time: `${m.hour}:${m.minute}:${m.second}` }
}

export default function Transactions() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allTxs, setAllTxs] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!localUser.phone) { router.push('/login'); return }
    setUser(localUser)
    loadTransactions(localUser.phone)
  }, [router])

  const loadTransactions = async (phone) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?phone=${phone}&t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setAllTxs(data.success? data.transactions : [])
    } catch { setAllTxs([]) }
    setLoading(false)
  }

  const filteredTxs = useMemo(() => {
    if (activeTab.toLowerCase() === 'all') return allTxs
    return allTxs.filter(tx => toTabKey(tx.type) === activeTab.toLowerCase())
  }, [allTxs, activeTab])

  if (!user) return <div className="p-4">Loading...</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        <div className="p-4 flex items-center gap-3 bg-white sticky top-0 z-10">
          <button onClick={()=>router.push('/dashboard')} style={{ fontSize:'26px', fontWeight:'900', color:HOT_GREEN, background:'none', border:'none' }}>←</button>
          <h1 style={{ fontSize:'19px', fontWeight:'900', color:HOT_GREEN }}>Transaction History</h1>
        </div>

        <div className="px-4 pb-2">
          <div className="flex gap-6 overflow-x-auto">
            {TABS.map(tab=>{
              const active = activeTab===tab
              return <button key={tab} onClick={()=>setActiveTab(tab)} style={{ background:'none', border:'none', borderBottom: active? `2.5px solid ${HOT_GREEN}` : '2px solid transparent', color: active? HOT_GREEN : '#999', fontWeight: active?'800':'600', fontSize:'13px', padding:'8px 0', whiteSpace:'nowrap' }}>{tab}</button>
            })}
          </div>
        </div>

        <div className="pb-20 pt-2 px-4">
          {loading? <p className="text-center py-10">Loading...</p> : filteredTxs.length===0? <p className="text-center py-10 text-gray-500">No transactions yet</p> :
            filteredTxs.map(tx=>{
              const isPending = String(tx.status).toLowerCase() === 'pending'
              const absAmt = Math.abs(Number(tx.amount)||0).toLocaleString()
              const normType = toTabKey(tx.type)
              const header = normType.charAt(0).toUpperCase() + normType.slice(1)
              const { date, time } = formatUgDateParts(tx.createdAt)
              return (
                <div key={tx.id} className="py-5 bg-white">
                  <p className="text-[15px] font-bold text-black">{header}</p>
                  {normType==='withdraw' && (
                    <p className="text-[11px] text-gray-500">Mobile: {tx.withdrawPhone || tx.phone} | Name: {tx.withdrawName}</p>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[14px] text-black">{absAmt}shs</p>
                    <p className={`text-[13px] lowercase font-medium ${isPending? 'text-red-500' : 'text-green-600'}`}>{tx.status}</p>
                  </div>
                  <p className="text-[13px] text-gray-600 mt-1">{date}</p>
                  <p className="text-[13px] text-gray-600">{time}</p>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}