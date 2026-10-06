'use client'

import Link from 'next/link'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// DO NOT TOUCH - Your inviter tracking logic
function SearchParamsTracker() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem('activeInviterCode', refCode)
      console.log('Inviter code captured:', refCode)
    }
  }, [refCode])

  return null
}

export default function Home() {

  return (
    <main style={{
      display: 'flex',
      height: '100vh',
      flexDirection: 'column',
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      textAlign: 'center'
    }}>

      <Suspense fallback={null}>
        <SearchParamsTracker />
      </Suspense>

      {/* WELCOME TO BOOKSFORWARD - Hot Orange */}
      <h1 style={{
        color: '#FF4F00',
        fontWeight: '900',
        fontSize: '2rem',
        letterSpacing: '2px',
        marginBottom: '32px',
        textTransform: 'uppercase'
      }}>
        WELCOME TO BOOKSFORWARD
      </h1>

      {/* BF Logo in Hot Orange */}
      <div style={{
        width: '130px',
        height: '130px',
        backgroundColor: '#FF4F00',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 0 40px rgba(255, 79, 0, 0.6)'
      }}>
        <span style={{
          color: '#000000',
          fontWeight: '900',
          fontSize: '3.5rem',
          letterSpacing: '-2px'
        }}>
          BF
        </span>
      </div>

      {/* Tagline */}
      <p style={{
        color: '#ffffff',
        fontSize: '1.1rem',
        marginBottom: '40px',
        opacity: '0.9'
      }}>
        Reading is our priority how about you?
      </p>

      {/* Orange Box Shaped Button -> Register */}
      <Link
        href="/register"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '320px',
          padding: '16px 0',
          background: '#FF4F00',
          color: '#000000',
          borderRadius: '12px',
          fontSize: '1.2rem',
          fontWeight: '900',
          textDecoration: 'none',
          boxShadow: '0 0 20px rgba(255, 79, 0, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}
      >
        GET STARTED
      </Link>

    </main>
  )
}