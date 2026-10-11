'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
const HOT_GREEN = '#00C853'

export default function TeamPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)

  useEffect(function() {
    const userData = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!userData.phone) {
      window.location.href = '/login'
      return
    }
    fetch('/api/team?phone=' + userData.phone + '&_t=' + Date.now(), { cache: 'no-store' })
     .then(function(r) { return r.json() })
     .then(function(res) {
        if (res.success) setData(res)
        setLoading(false)
      })
     .catch(function() { setLoading(false) })
  }, [])

  if (!data &&!loading) return <div className="min-h-screen flex items-center justify-center">No data</div>

  const teamAList = data?.listA || []
  const teamBList = data?.listB || []
  const teamCList = data?.listC || []

  // FRESH COMMISSION - from transactions history (team commission) = old + new as one big number
  let displayCommission = 0
  if (data?.transactions && Array.isArray(data.transactions)) {
    const commissionTx = data.transactions.filter(function(tx){
      const t = String(tx.type || tx.txType || tx.label || '').toLowerCase()
      return t.includes('commission') || t.includes('referral') || t.includes('team')
    })
    displayCommission = commissionTx.reduce(function(s, tx){ return s + Number(tx.amount || 0) }, 0)
    if (displayCommission === 0) {
      displayCommission = data.teamCommissionTotal!== undefined? Number(data.teamCommissionTotal) : Number(data.total || 0)
    }
  } else {
    displayCommission = data?.teamCommissionTotal!== undefined? Number(data?.teamCommissionTotal) : Number(data?.total || 0)
  }

  const getActiveList = function(team) {
    if (team === 'A') return teamAList
    if (team === 'B') return teamBList
    if (team === 'C') return teamCList
    return []
  }

  // FIXED: return digit only 0 1 2 3 4
  const formatVip = function(raw) {
    if (raw === null || raw === undefined) return '0'
    const s = String(raw).toLowerCase().trim()
    const m = s.match(/[0-4]/)
    if (m) return m[0]
    if (s === 'vip0' || s === 'vip1' || s === 'vip2' || s === 'vip3' || s === 'vip4') return s.replace('vip','')
    return '0'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div style={{
        width:'100%',
        background:HOT_GREEN,
        padding:'14px 20px',
        display:'flex',
        alignItems:'center',
        gap:'12px',
        position:'sticky',
        top:0,
        zIndex:50
      }}>
        {selectedTeam? (
          <button onClick={function(){ setSelectedTeam(null) }} style={{color:'#fff', fontSize:'22px', fontWeight:900, background:'none', border:'none', cursor:'pointer'}}>←</button>
        ) : (
          <Link href="/dashboard" style={{color:'#fff', fontSize:'22px', fontWeight:900, textDecoration:'none'}}>←</Link>
        )}
        <h1 style={{color:'#fff', fontWeight:900, fontSize:'18px', margin:0}}>
          {selectedTeam? `Team ${selectedTeam}` : 'Team'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* REMOVED GREEN BOX - NOW WHITE, SUBHEADER HOT GREEN, AMOUNT BOLD BLACK UGX */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
          <p className="text-xs font-black uppercase tracking-wider mb-2" style={{color:HOT_GREEN}}>COMMISSION FROM TEAM</p>
          <p className="text-3xl font-black" style={{color:'#000'}}>
            {loading? '...' : `UGX ${displayCommission.toLocaleString()}`}
          </p>
        </div>

        {loading? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {!selectedTeam && (
              <div className="flex flex-col gap-3 mb-6">
                <button type="button" onClick={function() { setSelectedTeam('A') }} className="rounded-xl border p-4 flex justify-between items-center outline-none cursor-pointer bg-white border-gray-100">
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase text-gray-400">TEAM A</p>
                    <p className="text-[10px] font-bold text-gray-600">{teamAList.length} Members</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-black" style={{color:HOT_GREEN}}>{teamAList.length}</p>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
                <button type="button" onClick={function() { setSelectedTeam('B') }} className="rounded-xl border p-4 flex justify-between items-center outline-none cursor-pointer bg-white border-gray-100">
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase text-gray-400">TEAM B</p>
                    <p className="text-[10px] font-bold text-gray-600">{teamBList.length} Members</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-black" style={{color:HOT_GREEN}}>{teamBList.length}</p>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
                <button type="button" onClick={function() { setSelectedTeam('C') }} className="rounded-xl border p-4 flex justify-between items-center outline-none cursor-pointer bg-white border-gray-100">
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase text-gray-400">TEAM C</p>
                    <p className="text-[10px] font-bold text-gray-600">{teamCList.length} Members</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-black" style={{color:HOT_GREEN}}>{teamCList.length}</p>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
              </div>
            )}

            {selectedTeam && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide pb-3 border-b border-gray-100 mb-3">
                  Team {selectedTeam} Members ({getActiveList(selectedTeam).length})
                </h3>
                {getActiveList(selectedTeam).length > 0? (
                  /* FIXED: LIST NOT SIDE BY SIDE, STANDALONE NUMBERS NO GREY BOX */
                  <div className="flex flex-col divide-y divide-gray-100">
                    {getActiveList(selectedTeam).map(function(member) {
                      const isObject = member && typeof member === 'object'
                      const phoneNum = isObject? member.phone : member
                      const rawVip = isObject? (member.vip || member.vipLevel || member.level || '') : ''
                      const vipDigit = formatVip(rawVip)
                      return (
                        <div key={phoneNum} className="flex justify-between items-center py-3 px-1">
                          <span className="text-[13px] font-bold text-gray-800 tracking-wide">{phoneNum}</span>
                          <span className="text-[13px] font-black text-gray-900 w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 border">{vipDigit}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-semibold py-6 text-center">No members in Team {selectedTeam}.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}