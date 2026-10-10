'use client'
import Card from '../../components/Card'

export default function ManagerPage() {
  const managers = [
    { name: "Jenn Vance", phone: "15513377400" }
  ]

  const getWaLink = (phone) => `https://wa.me/${phone}?text=${encodeURIComponent('hello 👋 manager Jenn Vance')}`

  return (
    <Card>
      <main style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '20px',
        paddingBottom: '96px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '20px',
          padding: '30px 20px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎧</div>
          
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '900', 
            color: '#00C853',
            marginBottom: '12px'
          }}>
            Contact Manager
          </h1>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '25px',
            lineHeight: '1.5'
          }}>
            Need online assistance? Please contact the hiring manager.
          </p>

          {managers.map((mgr) => (
            <button 
              key={mgr.phone}
              onClick={() => window.open(getWaLink(mgr.phone), "_blank")}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px 20px',
                borderRadius: '14px',
                background: '#25D366',
                border: 'none',
                color: 'white',
                fontWeight: '900',
                fontSize: '16px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                cursor: 'pointer'
              }}
            >
              👤 Chat with {mgr.name}
            </button>
          ))}

          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'left'
          }}>
            <div>📱 Manager Jenn Vance: +1 (551) 337-7400</div>
          </div>
        </div>
      </main>
    </Card>
  )
}