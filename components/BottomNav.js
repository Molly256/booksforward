'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function BottomNav() {
  const pathname = usePathname()
  
  const hideOnRoutes = ['/', '/login', '/register'] 
  if (hideOnRoutes.includes(pathname)) {
    return null
  }

  const HOT_GREEN = '#00C853'

  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    { href: '/viplevels', icon: '👑', label: 'VipLevels' },
    { href: '/task', icon: '📚', label: 'Tasks' },
    { href: '/my', icon: '👤', label: 'My' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      maxWidth: '480px', 
      height: '75px',
      background: '#FFFFFF', 
      display: 'flex',
      justifyContent: 'space-around', 
      alignItems: 'center',
      borderTop: '1px solid #F1F5F9', 
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', 
      margin: '0 auto', 
      padding: '0 10px 10px 10px', 
      zIndex: 99999, 
      boxSizing: 'border-box',
      gap: '4px' 
    }}>
      {navItems.map(item => {
        const isActive = pathname === item.href || 
          (item.href === '/dashboard' && pathname.startsWith('/dashboard/')) || 
          (item.href === '/my' && pathname.startsWith('/my')) || 
          (item.href === '/books' && pathname.startsWith('/books')) ||
          (item.href === '/viplevels' && pathname.startsWith('/viplevels'))
        return (
          <Link key={item.href} href={item.href} style={{ 
            textDecoration: 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center', 
            gap: '4px', 
            flex: 1, 
            height: '56px', 
            borderRadius: '12px', 
            background: isActive ? HOT_GREEN : 'transparent', 
            transform: isActive ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s ease-in-out', 
            WebkitTapHighlightColor: 'transparent', 
            boxSizing: 'border-box',
            padding: '4px 0'
          }}>
            <span style={{ 
              fontSize: '22px', 
              lineHeight: '1',
              filter: isActive ? 'brightness(0) invert(1)' : 'brightness(0.6) grayscale(0.3)',
              transition: 'all 0.2s ease'
            }}>
              {item.icon}
            </span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '900', 
              color: isActive ? '#fff' : '#8E8E93',
              transition: 'color 0.2s ease'
            }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}