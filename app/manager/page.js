'use client'

export default function ManagerPage() {
  const managers = [
    { name: "Jenn Vance", phone: "15513377400" }
  ]

  const getWaLink = (phone) => `https://wa.me/${phone}?text=${encodeURIComponent('hello 👋 manager Jenn Vance')}`

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* HEADER - HOT GREEN + WHITE BOLD */}
      <div style={{ background: '#00C853', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
          Customer service
        </h1>
      </div>

      <div style={{
        flex: 1,
        background: '#FFFFFF',
        padding: '20px',
        paddingBottom: '96px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
          {/* HEADPHONES - BLACK + HOT GREEN EAR COVERS */}
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 50 C15 20 30 10 50 10 C70 10 85 20 85 50" stroke="#111" strokeWidth="9" strokeLinecap="round" fill="none"/>
              <rect x="10" y="42" width="20" height="38" rx="10" fill="#111" />
              <rect x="70" y="42" width="20" height="38" rx="10" fill="#111" />
              <rect x="14" y="46" width="12" height="30" rx="6" fill="#00C853" />
              <rect x="74" y="46" width="12" height="30" rx="6" fill="#00C853" />
            </svg>
          </div>
          
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
            lineHeight: '1.5',
            maxWidth: '300px'
          }}>
            Need online assistance? Please contact the hiring manager.
          </p>

          {managers.map((mgr) => (
            <button 
              key={mgr.phone}
              onClick={() => window.open(getWaLink(mgr.phone), "_blank")}
              style={{
                width: '100%',
                maxWidth: '340px',
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
      </div>
    </main>
  )
}