'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const HOT_GREEN = '#00C853'

// NEW TABS - shares removed, renamed
const TABS = ['ALL', 'DEPOSIT', 'WITHDRAW', 'DAILY INCOME', 'VIPLEVEL PURCHASE', 'REFUND', 'MAGICAL WHEEL', 'TEAM']

const TYPE_MAP = {
  'vip': 'viplevel purchase',
  'refund_vip': 'refund',
  'deposit': 'deposit',
  'system increase': 'deposit',
  'withdraw': 'withdraw',
  'daily income': 'daily income',
  'daily_income': 'daily income',
  'wheel': 'magical wheel',
  'lucky wheel': 'magical wheel',
  'lucky_wheel': 'magical wheel',
  'magical wheel': 'magical wheel',
  'magical_wheel': 'magical wheel',
  'commission': 'team',
  'team': 'team',
  'myteam': 'team',
  'invite': 'team',
  'team_a_payout': 'team',
  'team_b_payout': 'team',
  'team_c_payout': 'team',
}

const toTabKey = (t) => {
  return TYPE_MAP[String(t || '').toLowerCase().trim()] || String(t || '').toLowerCase().replace(/_/g, ' ').trim()
}

export default function Transactions() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allTxs, setAllTxs] = useState([])
  const [activeTab, setActiveTab] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!localUser.phone) {
      router.push('/login')
      return
    }
    setUser(localUser)
    loadTransactions(localUser.phone)
  }, [router])

  const loadTransactions = async (phone) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?phone=${phone}&t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setAllTxs(data.success? data.transactions : [])
    } catch (err) {
      setAllTxs([])
    }
    setLoading(false)
  }

  const filteredTxs = useMemo(() => {
    if (activeTab === 'ALL') return allTxs
    const tabKey = activeTab.toLowerCase()
    return allTxs.filter(tx => toTabKey(tx.type) === tabKey)
  }, [allTxs, activeTab])

  // Keep full YYYY-MM-DD HH:mm:ss with hour-minute-second
  const formatUgDate = (createdAt) => {
    if (!createdAt) return ''
    return String(createdAt).slice(0,19) // YYYY-MM-DD HH:mm:ss
  }

  const renderTx = (tx) => {
    const amount = Number(tx.amount) || 0
    const isSystemIncrease = String(tx.type).toLowerCase().trim() === 'system increase'
    const isWithdraw = String(tx.type || '').toLowerCase().trim() === 'withdraw'
    const isDeposit = String(tx.type || '').toLowerCase().includes('deposit') || isSystemIncrease

    const statusColor = tx.status === 'success'
     ? 'text-green-600'
      : tx.status === 'pending'
       ? 'text-orange-500'
        : 'text-gray-500'

    return (
      <div key={tx.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col w-full">
            <p className="text-black text-sm font-semibold uppercase tracking-tight">
              {String(tx.type).toLowerCase() === 'lucky wheel'? 'MAGICAL WHEEL' : String(tx.type).toLowerCase() === 'myteam'? 'TEAM' : tx.type || 'Transaction'}
            </p>
            <p className="text-gray-600 text-xs font-light mt-0.5">{tx.label || tx.type}</p>

            {isWithdraw && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 flex flex-col gap-1 text-xs text-gray-700 font-normal">
                <p>Requested Phone: <span className="text-black font-semibold ml-1">{tx.phone || user?.phone}</span></p>
                <p>Mobile Money Number: <span className="text-black font-semibold ml-1">{tx.withdrawPhone || tx.phoneNumber}</span></p>
                <p>Holder Name: <span className="text-black font-semibold ml-1">{tx.withdrawName || tx.accountName}</span></p>
                <p>Network Gateway: <span className="text-blue-600 font-semibold ml-1">{tx.method || 'MOBILE MONEY'}</span></p>
              </div>
            )}

            <div className="mt-3 flex justify-between items-center bg-gray-50 p-2 rounded-md">
              <span className="text-gray-500 text-[11px] font-mono">{formatUgDate(tx.createdAt || tx.timestamp)} UGA</span>
              <span className={`text-sm font-bold ${isSystemIncrease? 'text-black opacity-60' : 'text-black'}`}>
                {isDeposit? '+' : '-'} {Math.abs(amount).toLocaleString()} shs
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-start ml-2">
            <p className={'text-xs font-bold capitalize ' + statusColor}>
              {tx.status || 'pending'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <div className="p-4 text-black">Loading...</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        <div className="p-4 flex items-center gap-3">
          <button onClick={()=>router.push('/dashboard')} className="text-xl">←</button>
          <h1 className="text-[18px] font-black text-black">Transaction History</h1>
        </div>

        {/* TABS - HOT GREEN TEXT ONLY, NO BOX */}
        <div className="px-4 pb-1">
          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => {
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="flex-shrink-0 whitespace-nowrap bg-transparent border-0 border-b-2 pb-1 text-[12px] font-bold tracking-wide"
                  style={{
                    color: active? HOT_GREEN : '#999',
                    borderBottomColor: active? HOT_GREEN : 'transparent',
                    borderBottomWidth: active? '2.5px' : '2px',
                    fontWeight: active? '900' : '600'
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 pb-20 space-y-3 pt-3">
          {loading? (
            <p className="text-black text-center py-10">Loading...</p>
          ) : filteredTxs.length === 0? (
            <p className="text-gray-500 text-center py-10">No transactions yet</p>
          ) : (
            filteredTxs.map(renderTx)
          )}
        </div>
      </div>
    </div>
  )
}