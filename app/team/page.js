'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function TeamPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState('A')

  useEffect(function() {
    const userData = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!userData.phone) {
      window.location.href = '/login'
      return
    }

    fetch('/api/team?phone=' + userData.phone)
   .then(function(r) { return r.json() })
   .then(function(res) {
        if (res.success) setData(res)
        setLoading(false)
      })
   .catch(function() { setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500 font-medium">Loading network tree...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">No data</div>

  const teamAList = data.listA || []
  const teamBList = data.listB || []
  const teamCList = data.listC || []

  let displayCommission = 0
  if (data.transactions && Array.isArray(data.transactions)) {
    displayCommission = data.transactions
   .filter(function(tx){
        const t = String(tx.type || tx.txType || '').toLowerCase()
        return t.startsWith('bf') && t.includes('commission')
      })
   .reduce(function(s, tx){ return s + Number(tx.amount || 0) }, 0)
    if (displayCommission === 0) {
      displayCommission = data.teamCommissionTotal!== undefined? Number(data.teamCommissionTotal) : Number(data.total || 0)
    }
  } else {
    displayCommission = data.teamCommissionTotal!== undefined? Number(data.teamCommissionTotal) : Number(data.total || 0)
  }

  const getActiveList = function() {
    if (selectedTeam === 'A') return teamAList
    if (selectedTeam === 'B') return teamBList
    if (selectedTeam === 'C') return teamCList
    return []
  }

  const formatVip = function(raw) {
    const v = String(raw || '').toLowerCase().trim()
    if (v === '0' || v === '') return 'vip0'
    if (['vip0','vip1','vip2','vip3','vip4','0','1','2','3','4'].includes(v)) {
      if (v.length === 1) return 'vip' + v
      return v
    }
    return 'vip0'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div style={{
        width:'100%',
        background:'#00C853',
        padding:'14px 20px',
        display:'flex',
        alignItems:'center',
        gap:'12px',
        position:'sticky',
        top:0,
        zIndex:50
      }}>
        <Link href="/dashboard" style={{color:'#fff', fontSize:'22px', fontWeight:900, textDecoration:'none'}}>←</Link>
        <h1 style={{color:'#fff', fontWeight:900, fontSize:'18px', margin:0}}>Team</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="rounded-2xl shadow-md p-6 mb-6" style={{background:'#00C853'}}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:'#000'}}>Commission from Team</p>
          <p className="text-3xl font-black" style={{color:'#000'}}>
            {displayCommission.toLocaleString()} shs
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button type="button" onClick={function() { setSelectedTeam('A') }} className={'rounded-xl border p-4 text-center outline-none cursor-pointer ' + (selectedTeam === 'A'? 'bg-[#00C853] border-[#00C853]' : 'bg-white border-gray-100')}>
            <p className={'text-xs font-bold uppercase ' + (selectedTeam === 'A'? 'text-white' : 'text-gray-400')}>Team A</p>
            <p className={'text-xl font-black my-1 ' + (selectedTeam === 'A'? 'text-white' : 'text-[#00C853]')}>{teamAList.length}</p>
            <p className={'text-[10px] font-bold ' + (selectedTeam === 'A'? 'text-white' : 'text-gray-600')}>Members</p>
          </button>
          <button type="button" onClick={function() { setSelectedTeam('B') }} className={'rounded-xl border p-4 text-center outline-none cursor-pointer ' + (selectedTeam === 'B'? 'bg-[#00C853] border-[#00C853]' : 'bg-white border-gray-100')}>
            <p className={'text-xs font-bold uppercase ' + (selectedTeam === 'B'? 'text-white' : 'text-gray-400')}>Team B</p>
            <p className={'text-xl font-black my-1 ' + (selectedTeam === 'B'? 'text-white' : 'text-[#00C853]')}>{teamBList.length}</p>
            <p className={'text-[10px] font-bold ' + (selectedTeam === 'B'? 'text-white' : 'text-gray-600')}>Members</p>
          </button>
          <button type="button" onClick={function() { setSelectedTeam('C') }} className={'rounded-xl border p-4 text-center outline-none cursor-pointer ' + (selectedTeam === 'C'? 'bg-[#00C853] border-[#00C853]' : 'bg-white border-gray-100')}>
            <p className={'text-xs font-bold uppercase ' + (selectedTeam === 'C'? 'text-white' : 'text-gray-400')}>Team C</p>
            <p className={'text-xl font-black my-1 ' + (selectedTeam === 'C'? 'text-white' : 'text-[#00C853]')}>{teamCList.length}</p>
            <p className={'text-[10px] font-bold ' + (selectedTeam === 'C'? 'text-white' : 'text-gray-600')}>Members</p>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide pb-3 border-b border-gray-100 mb-3">
            Team {selectedTeam} Members ({getActiveList().length})
          </h3>
          {getActiveList().length > 0? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {getActiveList().map(function(member) {
                const isObject = member && typeof member === 'object'
                const phoneNum = isObject? member.phone : member
                const rawVip = isObject? (member.vip || member.vipLevel || member.level || '') : ''
                const vipLabel = formatVip(rawVip)
                return (
                  <div key={phoneNum} className="bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold py-2.5 px-3 rounded-lg text-center flex items-center justify-center gap-2">
                    <span>{phoneNum}</span>
                    <span className="text-[10px] font-black lowercase">{vipLabel}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 font-semibold py-6 text-center">No members yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}