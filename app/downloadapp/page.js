'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{})
    }
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return function() {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function triggerToast(msg) {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  async function onTapInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null)
        triggerToast('✅ App installed!')
      }
    } else {
      const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
      if (isIOS) {
        triggerToast('📲 Tap Share ⬆️ → Add to Home Screen')
      } else {
        triggerToast('📲 Tap browser menu ⋮ → Install app')
      }
    }
  }

  return (
    <main className="min-h-screen bg-white">
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
        <h1 style={{color:'#fff', fontWeight:900, fontSize:'18px', margin:0}}>Download App</h1>
      </div>

      {showToast && (
        <div style={{
          position:'fixed',
          top:'20px',
          left:'50%',
          transform:'translateX(-50%)',
          background:'#00C853',
          color:'#fff',
          padding:'14px 20px',
          borderRadius:'12px',
          fontWeight:900,
          fontSize:'13px',
          zIndex:9999,
          boxShadow:'0 8px 24px rgba(0,200,83,0.4)',
          width:'90%',
          maxWidth:'360px',
          textAlign:'center',
          animation:'slideDown 0.3s ease'
        }}>
          {toastMsg}
        </div>
      )}

      <div style={{padding:'40px 20px', display:'flex', justifyContent:'center', marginTop:'30px'}}>
        <button
          onClick={onTapInstall}
          style={{
            width:'100%',
            maxWidth:'360px',
            padding:'16px',
            background:'#00C853',
            color:'#000',
            border:'none',
            borderRadius:'12px',
            fontSize:'16px',
            fontWeight:900,
            cursor:'pointer'
          }}
        >
          Install booksforward app
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </main>
  )
}