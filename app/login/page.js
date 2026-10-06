'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const lockRef = useRef(false) 
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const HOT_GREEN = '#00C853'

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, phone: cleaned }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (lockRef.current) return
    lockRef.current = true

    if (!/^07\d{8}$/.test(form.phone)) {
      showToast('Phone must start with 07 and be 10 digits')
      lockRef.current = false
      return
    }
    if (!form.password) {
      showToast('Enter your password')
      lockRef.current = false
      return
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          phone: form.phone,
          password: form.password 
        })
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Authentication failed')
        lockRef.current = false 
        return
      }

      if (data && data.user) {
        localStorage.setItem('booksforward_user', JSON.stringify(data.user))
        showToast('Login successful!', 'success')
        setTimeout(() => {
          if (data.user.isAdmin) {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
        }, 600)
      } else {
        showToast('Server returned incomplete session. Try again.')
        lockRef.current = false
      }
      
    } catch (err) {
      console.error('Login submit error:', err)
      showToast('Something went wrong. Check connection.')
      lockRef.current = false 
    }
  }

  const inputStyle = {
    width: '100%',
    height: '44px', 
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0 12px',
    fontSize: '16px',
    color: '#000',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>
      
      {/* BLACK TOAST */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? HOT_GREEN : '#111111',
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

      <div style={{ width: '100%', maxWidth: '380px', background:'#FFFFFF' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', textAlign: 'center', marginBottom: '24px', color: '#000' }}>Login</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '15px', color: '#000', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Phone Number</label>
            <input
              type="tel"
              placeholder="07XXXXXXXX"
              value={form.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={10}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '15px', color: '#000', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                maxLength={6}
                style={{...inputStyle, paddingRight: '44px'}}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                👁️
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{ 
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: HOT_GREEN,
              color: '#fff',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '4px',
              boxShadow:'0 4px 10px rgba(0,200,83,0.35)'
            }}
          >
            Login
          </button>
        </form>
        
        <p style={{ textAlign: 'center', fontSize: '15px', color: '#000', marginTop: '16px' }}>
          Don't have an account? <a href="/register" style={{ color: HOT_GREEN, textDecoration: 'underline', fontWeight: '700' }}>Register</a>
        </p>
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