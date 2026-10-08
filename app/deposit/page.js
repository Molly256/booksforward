'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Deposit() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [selectedNetwork, setSelectedNetwork] = useState(null)
  const [amount, setAmount] = useState('')
  const [billedNumber, setBilledNumber] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const paymentDetails = {
    MTN: { number: '0773207301', name: 'NABIWAFU JUDITH' },
    AIRTEL: { number: '0704113706', name: 'MABONGA SUZAN' }
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!localUser.phone) {
      router.push('/login')
      return
    }
    setUser(localUser)
  }, [router])

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
    }
  }

  const toBase64 = (file) => new Promise((resolve, reject)=>{
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

  const handleDeposit = async () => {
    const amt = Number(amount)

    if (!amt || amt < 50000) {
      showToast('Minimum deposit is 50,000 UGX')
      return
    }
    if (!billedNumber || billedNumber.trim().length < 9) {
      showToast('Enter the number that was billed / sent money')
      return
    }
    if (!file) {
      showToast('Please upload transaction proof')
      return
    }

    setLoading(true)

    try {
      const base64Image = await toBase64(file)

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deposit',
          phone: user.phone,
          amount: amt,
          method: selectedNetwork,
          billedPhone: billedNumber.trim(),
          proofImage: base64Image,
          status: 'pending'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to submit')
        setLoading(false)
        return
      }

      showToast('Deposit request submitted. Wait for approval.', 'success')
      setTimeout(() => router.push('/transactions'), 800)

    } catch (err) {
      console.error('Deposit error:', err)
      showToast('Something went wrong')
      setLoading(false)
    }
  }

  if (!user) return <div className="p-4 text-black">Loading...</div>

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success'? '#00c853' : '#111111',
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
          {toast.message}
        </div>
      )}

      <div className="bg-[#00c853] text-white py-4 px-4 flex items-center gap-3 shadow-md">
        <button
          onClick={() => selectedNetwork? setSelectedNetwork(null) : router.back()}
          className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#00c853] text-xl font-bold"
        >
          ←
        </button>
        <h1 className="text-[15px] font-black tracking-widest">
          {selectedNetwork? `${selectedNetwork} NETWORK` : 'DEPOSIT'}
        </h1>
      </div>

      <div className="p-5 flex flex-col items-center">
        {!selectedNetwork && (
          <>
            <div className="w-full max-w-[340px] bg-[#00c853] rounded-[20px] p-6 shadow-[0_8px_20px_rgba(0,200,83,0.3)] mt-2">
              <div className="flex justify-between items-start">
                <div className="text-4xl">💳</div>
                <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-black tracking-widest">BF</div>
              </div>
              <div className="mt-8">
                <div className="h-3 w-10 bg-black/20 rounded-full mb-3"></div>
                <div className="h-2 w-full bg-black/10 rounded-full"></div>
              </div>
              <p className="mt-6 text-black font-bold text-sm tracking-widest">BOOKS FORWARD</p>
            </div>

            <div className="text-center mt-8">
              <h2 className="text-[16px] font-black text-black">SELECT PAYMENT NETWORK</h2>
              <p className="text-[12px] text-gray-500 mt-1">Choose your desired deposit network</p>
            </div>

            <div className="w-full max-w-[340px] mt-6 space-y-4">
              <button onClick={() => setSelectedNetwork('MTN')} className="w-full bg-[#ffcc00] rounded-[16px] p-5 flex items-center justify-between active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-black text-sm">MTN</div>
                  <p className="font-black text-black text-[15px]">MTN NETWORK</p>
                </div>
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[#ffcc00]">→</div>
              </button>

              <button onClick={() => setSelectedNetwork('AIRTEL')} className="w-full bg-[#ff0000] rounded-[16px] p-5 flex items-center justify-between active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#ff0000] font-black text-[10px]">AIRTEL</div>
                  <p className="font-black text-white text-[15px]">AIRTEL NETWORK</p>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#ff0000]">→</div>
              </button>
            </div>
          </>
        )}

        {selectedNetwork && (
          <div className="w-full max-w-[400px]">
            <div className="bg-[#f9f9f9] rounded-xl p-5 border border-gray-100">
              <p className="text-[13px] text-gray-500 font-bold">Send to:</p>
              <p className="text-[16px] font-black text-black mt-1">{paymentDetails[selectedNetwork].name}</p>
              <div className="mt-3 flex justify-between items-center">
                <div>
                  <p className="text-[13px] text-gray-500 font-bold">Number:</p>
                  <p className="text-[16px] font-black text-black mt-1">{paymentDetails[selectedNetwork].number}</p>
                </div>
                <button onClick={() => {
                  navigator.clipboard.writeText(paymentDetails[selectedNetwork].number)
                  showToast('Number copied!', 'success')
                }} className="bg-black text-white text-[11px] px-3 py-1.5 rounded-full font-bold">COPY</button>
              </div>
            </div>

            <div className="mt-8">
              <label className="text-[13px] font-black text-black">Amount(UGX)</label>
              <input
                type="number"
                placeholder="e.g 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-2 bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-black text-[15px] outline-none focus:border-[#00c853]"
              />
              <p className="text-[11px] text-gray-500 mt-2">Minimum deposit is 50,000 UGX</p>
            </div>

            <div className="mt-5">
              <label className="text-[13px] font-black text-black">Number that was billed / sent money</label>
              <input
                type="tel"
                placeholder="e.g 077xxxxxxx"
                value={billedNumber}
                onChange={(e) => setBilledNumber(e.target.value)}
                className="w-full mt-2 bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-black text-[15px] outline-none focus:border-[#00c853]"
              />
              <p className="text-[11px] text-gray-500 mt-2">Enter the phone that actually deposited</p>
            </div>

            <div className="mt-6">
              <label className="text-[13px] font-black text-black">Upload transaction proof</label>
              <label className="w-full mt-2 border border-dashed border-gray-300 rounded-xl px-4 py-6 flex flex-col items-center justify-center cursor-pointer bg-[#fafafa]">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {preview? (
                  <img src={preview} alt="proof" className="w-full max-h-[200px] object-contain rounded-lg" />
                ) : (
                  <>
                    <div className="w-10 h-10 bg-[#00c853]/10 rounded-full flex items-center justify-center text-[#00c853] text-xl">↑</div>
                    <p className="text-[13px] font-bold text-black mt-2">Choose file from gallery</p>
                    <p className="text-[11px] text-gray-400">Tap to pick screenshot</p>
                  </>
                )}
              </label>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full mt-8 bg-[#00c853] text-black font-black text-[14px] tracking-widest py-4 rounded-xl active:scale-[0.98] disabled:opacity-50"
            >
              {loading? 'Processing...' : 'SUBMIT TRANSACTION'}
            </button>
          </div>
        )}
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