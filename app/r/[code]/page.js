'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ReferralRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const raw = params?.code
    const code = raw ? String(raw).toUpperCase().trim() : ''
    
    if (code && /^\d{6}BF$/.test(code)) {
      try {
        localStorage.setItem('referrer_code', code)
        sessionStorage.setItem('referrer_code', code)
        sessionStorage.setItem('activeInviterCode', code)
      } catch {}
    }
    router.replace('/')
  }, [params, router])

  return null
}