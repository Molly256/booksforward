'use client'

import './globals.css'
import BottomNav from '../components/BottomNav'
import SWRegister from '../components/SWRegister'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()

  const hideNavPages = ['/', '/register', '/login']
  const shouldHideNav = hideNavPages.includes(pathname)

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/booksforward-icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" type="image/png" href="/booksforward-icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#00BFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>BooksForward</title>
        <meta name="description" content="BooksForward - Read and Earn" />
        <meta property="og:title" content="BooksForward" />
        <meta property="og:description" content="BooksForward - Read and Earn" />
        <meta property="og:site_name" content="BooksForward" />
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        paddingBottom: shouldHideNav ? '0px' : '75px', 
        minHeight: '100dvh',   
        background: '#fff',
        boxSizing: 'border-box'
      }}>
        <SWRegister />
        
        <main style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
          {children}
        </main>
        
        {!shouldHideNav && <BottomNav />}
      </body>
    </html>
  )
}