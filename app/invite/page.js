'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InvitePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)

  const HOT_GREEN = '#00c853'
  const BASE_URL = 'https://booksforward.us.com'

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem('booksforward_user')
      if (cached) {
        const parsedData = JSON.parse(cached)
        if (parsedData && parsedData.user) {
          setUser(parsedData.user)
        } else {
          setUser(parsedData)
        }
      } else {
        router.push('/login')
      }
    } catch (e) {
      console.error('LocalStorage parsing error:', e)
    }
  }, [router])

  if (!user) return <div className="p-4 text-black">Loading...</div>

  const inviteCode = user?.inviteCode || user?.invite_code || user?.myInviteCode || '------'
  const inviteLink = `${BASE_URL}/?code=${inviteCode}`

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied successfully', 'success')
    } catch (err) {
      showToast('Failed to copy')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative">

      {/* BLACK TOAST */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success'? HOT_GREEN : '#111111',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '25px',
          fontSize: '13px',
          fontWeight: '700',
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          maxWidth: '90%',
          textAlign: 'center',
          animation: 'slideDown 0.3s ease'
        }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER - HOT GREEN INVITE */}
      <div className="bg-[#00c853] text-white py-4 px-4 flex items-center gap-3 shadow-md">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#00c853] text-xl font-bold"
        >
          ←
        </button>
        <h1 className="text-[15px] font-black tracking-widest">INVITE</h1>
      </div>

      <div className="p-5 flex flex-col items-center">

        {/* INVITE CODE CARD - JUST BELOW HEADER - CODE IN HOT GREEN */}
        <div className="w-full max-w-[400px] bg-[#f6f6f6] border border-gray-200 rounded-[16px] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 tracking-widest">MY INVITE CODE</p>
            <p className="text-[26px] font-black tracking-widest mt-1" style={{ color: HOT_GREEN }}>
              {inviteCode}
            </p>
          </div>
          <button onClick={() => handleCopy(inviteCode)} className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white active:scale-95">
            ⎙
          </button>
        </div>

        {/* URL THAT HAS INVITE CODE */}
        <div className="w-full max-w-[400px] mt-4 bg-white border border-gray-200 rounded-[12px] p-4 flex items-center justify-between gap-3">
          <p className="text-[12px] text-black font-medium break-all flex-1">{inviteLink}</p>
          <button onClick={() => handleCopy(inviteLink)} className="w-9 h-9 bg-[#00c853] rounded-full flex items-center justify-center text-black font-bold text-[14px] shrink-0 active:scale-95">
            ⎙
          </button>
        </div>

        {/* COMMISSION TEXT YOU ASKED */}
        <div className="w-full max-w-[400px] mt-10">
          <h2 className="text-[15px] font-black text-black">Invite and earn commission from initial deposits</h2>

          <div className="mt-6 space-y-4">
            <p className="text-[14px] font-bold text-black">Team A earns you <span style={{ color: HOT_GREEN }}>10%</span></p>
            <p className="text-[14px] font-bold text-black">Team B earns you <span style={{ color: HOT_GREEN }}>3%</span></p>
            <p className="text-[14px] font-bold text-black">Team C earns you <span style={{ color: HOT_GREEN }}>1%</span></p>
          </div>

          <div className="mt-8 bg-[#E8F5E9] rounded-xl p-4 border-l-4 border-[#00c853]">
            <p className="text-[12px] font-black text-black">Note:</p>
            <p className="text-[12px] text-gray-700 mt-1 leading-[18px]">
              Use your invitation link to invite friends and family to read and earn, grow with you.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}