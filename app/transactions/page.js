'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const HOT_GREEN = '#00C853'
const TABS = ['ALL', 'DEPOSIT', 'WITHDRAW', 'DAILY INCOME', 'VIPLEVEL PURCHASE', 'REFUND', 'MAGICAL WHEEL', 'TEAM']

const TYPE_MAP = {
  'vip': 'viplevel purchase', 'buy_vip': 'viplevel purchase',
  'refund_vip': 'refund',
  'deposit': 'deposit', 'system increase': 'deposit', 'system_increase': 'deposit',
  'withdraw': 'withdraw',
  'daily income': 'daily income', 'daily_income': 'daily income', 'book_income': 'daily income',
  'wheel': 'magical wheel', 'lucky wheel': 'magical wheel', 'magical wheel': 'magical wheel',
  'commission': 'team', 'team': 'team', 'myteam': 'team', 'invite': 'team',
  'team_a_payout': 'team', 'team_b_payout': 'team', 'team_c_payout': 'team',
}
const toTabKey = (t) => TYPE_MAP[String(t||'').toLowerCase().trim()] || String(t||'').toLowerCase().replace(/_/g,' ').trim()

export default function Transactions() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allTxs, setAllTxs] = useState([])
  const [activeTab, setActiveTab] = useState('ALL')
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
    if (activeTab === 'ALL') return allTxs
    return allTxs.filter(tx => toTabKey(tx.type) === activeTab.toLowerCase())
  }, [allTxs, activeTab])

  const formatUgDate = (c) => String(c||'').slice(0,19)

  if (!user) return <div className="p-4">Loading...</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        <div className="p-4 flex items-center gap-3 bg-white sticky top-0 z-10">
          <button onClick={()=>router.push('/dashboard')} style={{ fontSize:'26px', fontWeight:'900', color:HOT_GREEN, background:'none', border:'none' }}>←</button>
          <h1 style={{ fontSize:'19px', fontWeight:'900', color:HOT_GREEN }}>Transaction History</h1>
        </div>

        <div className="px-4 pb-1">
          <div className="flex gap-5 overflow-x-auto pb-2 border-b border-gray-100">
            {TABS.map(tab=>{
              const active = activeTab===tab
              return <button key={tab} onClick={()=>setActiveTab(tab)} style={{ background:'none', border:'none', borderBottom: active? `2.5px solid ${HOT_GREEN}` : '2px solid transparent', color: active? HOT_GREEN : '#999', fontWeight: active?'900':'600', fontSize:'12px', padding:'8px 0', whiteSpace:'nowrap' }}>{tab}</button>
            })}
          </div>
        </div>

        <div className="px-4 pb-20 space-y-3 pt-4">
          {loading? <p className="text-center py-10">Loading...</p> : filteredTxs.length===0? <p className="text-center py-10 text-gray-500">No transactions yet</p> :
            filteredTxs.map(tx=>{
              const isPending = String(tx.status).toLowerCase() === 'pending'
              const absAmt = Math.abs(Number(tx.amount)||0).toLocaleString()

              return (
                <div key={tx.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex justify-between">
                    <div className="w-full">
                      <p className="text-sm font-bold uppercase text-black">{String(tx.type).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{tx.label}</p>
                      {String(tx.type).toLowerCase()==='withdraw' && (
                        <div className="mt-2 text-[11px] text-gray-700 border-t border-dashed pt-2">
                          <p>Mobile: {tx.withdrawPhone || tx.phone}</p>
                          <p>Name: {tx.withdrawName}</p>
                        </div>
                      )}
                      <div className="mt-2 flex justify-between bg-gray-50 p-2 rounded">
                        <span className="text-[11px] font-mono font-bold text-gray-500">{formatUgDate(tx.createdAt)} UGA</span>
                        {/* NO + or - sign */}
                        <span className={`text-sm ${isPending? 'text-red-500 font-light' : 'text-black font-medium'}`}>{absAmt} shs</span>
                      </div>
                    </div>
                    {/* pending red light, success green medium */}
                    <span className={`text-xs ml-3 capitalize ${isPending? 'text-red-500 font-light' : 'text-green-600 font-medium'}`}>{tx.status}</span>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}