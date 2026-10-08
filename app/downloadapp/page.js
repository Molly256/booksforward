'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(function() {
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return function() {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function onTapInstall() {
    setShowPopup(true)
  }

  async function onYes() {
    setShowPopup(false)
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      // if prompt not ready yet, try to trigger install
      if (window.navigator && window.navigator.share) {
        // fallback
      }
      alert('To install: Tap browser menu ⋮ → Install app / Add to Home screen')
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* HOT GREEN HEADER */}
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

      {showPopup && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
          background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:999, padding:'20px'
        }}>
          <div style={{
            background:'#fff', padding:'24px', borderRadius:'16px',
            width:'100%', maxWidth:'320px', textAlign:'center'
          }}>
            <p style={{fontSize:'15px', fontWeight:700, color:'#000', marginBottom:'20px'}}>
              Do you want to install books forward app?
            </p>
            <div style={{display:'flex', gap:'12px'}}>
              <button
                onClick={function(){ setShowPopup(false) }}
                style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #ddd', background:'#fff', fontWeight:800}}
              >
                No
              </button>
              <button
                onClick={onYes}
                style={{flex:1, padding:'10px', borderRadius:'10px', border:'none', background:'#00C853', color:'#000', fontWeight:900}}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}