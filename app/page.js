'use client'

import Link from 'next/link'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SearchParamsTracker() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem('activeInviterCode', refCode)
    }
  }, [refCode])

  return null
}

export default function Home() {
  const HOT_GREEN = '#00C853'

  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      textAlign: 'center'
    }}>

      <Suspense fallback={null}>
        <SearchParamsTracker />
      </Suspense>

      {/* HEADER - Hot Green */}
      <h1 style={{
        color: HOT_GREEN,
        fontWeight: '900',
        fontSize: '2rem',
        letterSpacing: '2px',
        marginBottom: '20px',
        textTransform: 'uppercase'
      }}>
        WELCOME TO BOOKSFORWARD
      </h1>

      {/* BF - Standalone Logo Hot Green Text */}
      <div style={{
        fontSize: '6rem',
        fontWeight: '900',
        color: HOT_GREEN,
        letterSpacing: '-4px',
        lineHeight: '1',
        marginBottom: '20px',
        textShadow: '0 2px 10px rgba(0,200,83,0.25)'
      }}>
        BF
      </div>

      {/* Subheader - Light Black */}
      <p style={{
        color: '#333333',
        fontSize: '1.1rem',
        marginBottom: '40px',
        fontWeight: '500',
        opacity: '0.85'
      }}>
        Reading is our priority how about you?
      </p>

      {/* Button Hot Green + Black Text Light Weight */}
      <Link
        href="/register"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '320px',
          padding: '16px 0',
          background: HOT_GREEN,
          color: '#000000',
          borderRadius: '12px',
          fontSize: '1.15rem',
          fontWeight: '500',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0,200,83,0.35)',
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