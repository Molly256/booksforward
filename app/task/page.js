'use client'
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

export default function TaskPage() {
  const [user, setUser] = useState(null)
  const [books, setBooks] = useState([])
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [toast, setToast] = useState('')
  const [readingBook, setReadingBook] = useState(null)
  const [timer, setTimer] = useState(15)
  const [jump, setJump] = useState(false)
  const [finished, setFinished] = useState(false)
  const lockRef = useRef(new Set())

  const fetchBooks = async (phone) => {
    try {
      const today = getUgandaDateString()
      const res = await fetch(`/api/books/data?phone=${phone}&date=${today}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      })
      const dataJson = await res.json()
      if (dataJson.success) {
        const mergedBooks = dataJson.books.map(b => ({
          ...b,
          cover: '/books/covers/' + b.bookId + '.jpg',
        }))
        setBooks(mergedBooks)
      }
      // HISTORY - MERGE SERVER + LOCAL, DON'T OVERWRITE
      const histRes = await fetch(`/api/books/history?phone=${phone}&_t=${Date.now()}`, { cache: 'no-store' })
      const histJson = await histRes.json()
      const serverHistory = histJson.success ? (histJson.history || []) : []
      
      // Load local history
      const localHistory = JSON.parse(localStorage.getItem(`task_history_${phone}`) || '[]')
      
      // Merge and dedupe by bookId
      const merged = [...serverHistory, ...localHistory]
      const unique = []
      const seen = new Set()
      for (const h of merged) {
        const id = String(h.bookId || h.id)
        if (!seen.has(id)) {
          seen.add(id)
          unique.push(h)
        }
      }
      // Sort newest first
      unique.sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))
      
      setHistory(unique)
      // Save merged back to local
      if (unique.length > 0) {
        localStorage.setItem(`task_history_${phone}`, JSON.stringify(unique))
      }
    } catch (err) {
      console.error('Fetch error:', err)
      // Fallback to local on error
      const phone = JSON.parse(localStorage.getItem('booksforward_user') || '{}').phone
      if (phone) {
        const localHistory = JSON.parse(localStorage.getItem(`task_history_${phone}`) || '[]')
        setHistory(localHistory)
      }
    }
  }

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('booksforward_user') || '{}')
    if (!userData.phone) return
    setUser(userData)
    // Load local history instantly before fetch
    const localHistory = JSON.parse(localStorage.getItem(`task_history_${userData.phone}`) || '[]')
    if (localHistory.length > 0) setHistory(localHistory)
    
    fetchBooks(userData.phone)
  }, [])

  useEffect(() => {
    if(!readingBook) return
    if(timer <= 0){ setFinished(true); return }
    const id = setInterval(()=>{
      setJump(true)
      setTimeout(()=> setJump(false), 180)
      setTimer(t=> t-1)
    },1000)
    return ()=> clearInterval(id)
  },[readingBook, timer])

  const showToastMsg = (msg) => {
    setToast(msg)
    setTimeout(()=> setToast(''), 2500)
  }

  const handleRead = (book) => {
    const currentlyReading = localStorage.getItem('currentlyReading')
    const completedRead = JSON.parse(localStorage.getItem('completedRead') || '[]')
    if (currentlyReading && currentlyReading !== String(book.bookId)) {
      showToastMsg('still have a pending reading'); return
    }
    if (completedRead.length > 0 && !completedRead.includes(String(book.bookId))) {
      showToastMsg('still have a pending submission'); return
    }
    if (completedRead.includes(String(book.bookId))) {
      showToastMsg('still have a pending submission'); return
    }
    if (book.status !== 'pending') return
    localStorage.setItem('currentlyReading', String(book.bookId))
    setReadingBook(book)
    setTimer(15)
    setFinished(false)
  }

  const handlePinkPlate = () => {
    localStorage.removeItem('currentlyReading')
    const completed = JSON.parse(localStorage.getItem('completedRead') || '[]')
    if(!completed.includes(String(readingBook.bookId))){
      completed.push(String(readingBook.bookId))
      localStorage.setItem('completedRead', JSON.stringify(completed))
    }
    if(user?.phone){
      fetch('/api/books/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, bookId: readingBook.bookId, action: 'read' })
      }).catch(()=>{})
    }
    setReadingBook(null)
    setTimer(15)
    setFinished(false)
    setBooks(prev=> prev.map(b=> b.bookId === readingBook.bookId? {...b, status:'read'} : b))
  }

  const handleSubmit = async (book) => {
    const completedRead = JSON.parse(localStorage.getItem('completedRead') || '[]')
    if (!completedRead.includes(String(book.bookId)) && book.status !== 'read') {
      return showToastMsg('Finish reading first')
    }
    if (lockRef.current.has('s-' + book.bookId)) return
    lockRef.current.add('s-' + book.bookId)
    
    setBooks(prev=> prev.map(b=> b.bookId === book.bookId? {...b, status:'submitted'} : b))
    
    try {
      const res = await fetch('/api/books/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          phone: user.phone,
          bookId: book.bookId,
          bookTitle: book.title,
          action: 'submit'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      
      const newUser = { ...user, availableBalance: data.availableBalance }
      setUser(newUser)
      localStorage.setItem('booksforward_user', JSON.stringify(newUser))
      const newCompleted = completedRead.filter(id=> String(id) !== String(book.bookId))
      localStorage.setItem('completedRead', JSON.stringify(newCompleted))
      localStorage.removeItem('currentlyReading')

      // FIX: CREATE HISTORY ITEM AND SAVE LOCALLY FIRST
      const newHistoryItem = {
        id: book.bookId,
        bookId: book.bookId,
        title: book.title,
        earned: Number(book.reward || 0),
        cover: '/books/covers/' + book.bookId + '.jpg',
        completedAt: new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala" })
      }
      
      // Update localStorage history - APPEND not replace
      const existingLocal = JSON.parse(localStorage.getItem(`task_history_${user.phone}`) || '[]')
      // Remove if already exists to avoid duplicate
      const filtered = existingLocal.filter(h => String(h.bookId) !== String(book.bookId))
      const updatedLocal = [newHistoryItem, ...filtered]
      localStorage.setItem(`task_history_${user.phone}`, JSON.stringify(updatedLocal))
      setHistory(updatedLocal)

      // Then sync with server
      await fetchBooks(user.phone)

    } catch(err) {
      showToastMsg(err.message || 'Submit failed')
      setBooks(prev=> prev.map(b=> b.bookId === book.bookId? {...b, status:'read'} : b))
    } finally {
      lockRef.current.delete('s-' + book.bookId)
    }
  }

  const handleClosePreviewWithoutFinishing = () => {
    setReadingBook(null)
    setTimer(15)
    setFinished(false)
  }

  if (!user) return null
  const vip = Number(user.vip || 0)
  const completedReadLS = typeof window!== 'undefined'? JSON.parse(localStorage.getItem('completedRead') || '[]') : []
  const pendingBooks = books.filter(b=> b.status === 'pending' || b.status === 'read')
  const HOT_GREEN = '#00C853'
  const LIGHT_GREEN = '#E8F5E9'

  if (readingBook) {
    return (
      <main style={{ minHeight: '100vh', background: '#fff', color: '#000', padding: 20, position: 'relative' }}>
        <button onClick={handleClosePreviewWithoutFinishing} style={{ fontWeight: 900, marginBottom: 20 }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20, paddingRight: 90 }}>{readingBook.title}</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, maxHeight: '80vh', overflowY: 'auto', fontFamily: 'inherit' }}>{readingBook.preview}</pre>
        {!finished && (
          <div style={{ position: 'fixed', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: 'white', border: '2px solid black', borderRadius: 16, padding: '8px 12px', boxShadow: '4px 4px 0px black', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src="/timer.png" alt="boy" style={{ width: 70, height: 70, objectFit: 'contain', transform: jump? 'translateY(-20px)' : 'translateY(0px)', transition: 'transform 0.18s' }} />
              <div style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>{timer}s</div>
            </div>
          </div>
        )}
        {finished && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={handlePinkPlate} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'bounce 1s infinite' }}>
              <div style={{ position: 'relative' }}>
                <img src="/boy-task-final.png" alt="task page boy" style={{ width: 240, objectFit: 'contain', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.2))' }} />
                <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', background: '#FF8DA1', border: '2px solid black', borderRadius: 999, padding: '8px 22px', boxShadow: '3px 3px 0px black', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 900, color: 'black', fontSize: 13 }}>Task page</span>
                </div>
              </div>
            </button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FFFFFF', padding: '20px', paddingBottom: 100, position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: HOT_GREEN, color: '#fff', padding: '10px 20px', borderRadius: 20, fontWeight: 900, fontSize: 13, zIndex: 9999, boxShadow: '0px 4px 10px rgba(0,0,0,0.2)' }}>{toast}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#000' }}>Tasks</h2>
        <button onClick={()=>setShowHistory(true)} style={{ border: '2px solid black', borderRadius: 20, padding: '6px 16px', fontWeight: 600, fontSize: 13, background: HOT_GREEN, color: '#000', boxShadow: '2px 2px 0px black' }}>Tasks history</button>
      </div>
      {pendingBooks.length === 0? (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#000' }}>
          <p style={{ fontSize: '16px', fontWeight: '700' }}>No tasks available now</p>
          {vip === 0 &&!user.vipActivated && (
            <Link href="/viplevels"><button style={{ marginTop: 16, padding: '14px 40px', borderRadius: '50px', border: 'none', background: HOT_GREEN, color: '#fff', fontWeight: '700', fontSize: '16px' }}>Buy VIP Level</button></Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {pendingBooks.map(book => {
            const isRead = completedReadLS.includes(String(book.bookId)) || book.status === 'read'
            return (
              <div key={book.bookId} style={{ background: '#fff', border: '2px solid black', borderRadius: '12px', padding: '12px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '3px 3px 0px black' }}>
                <img src={book.cover} alt={book.title} style={{ width: 80, height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#000' }}>{book.title}</h3>
                  <p style={{ margin: '4px 0 10px', fontSize: '11px', color: '#666' }}>Reward: UGX {book.reward}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={()=> handleRead(book)} style={{ flex: 1, padding: '8px', borderRadius: '20px', border: '2px solid black', background: isRead? LIGHT_GREEN : HOT_GREEN, color: isRead? '#999' : '#fff', fontWeight: '900', fontSize: 12 }}>{isRead? 'Read ✓' : 'Read'}</button>
                    <button onClick={()=> handleSubmit(book)} disabled={!isRead} style={{ flex: 1, padding: '8px', borderRadius: '20px', border: '2px solid black', background: isRead? HOT_GREEN : LIGHT_GREEN, color: isRead? '#fff' : '#aaa', fontWeight: '900', fontSize: 12, cursor:!isRead? 'not-allowed' : 'pointer' }}>Submit</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: 380, height: '100%', padding: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>Task History</h2>
              <button onClick={()=>setShowHistory(false)} style={{ fontWeight: 900, fontSize: 20 }}>✕</button>
            </div>
            {history.length === 0 && <p style={{ color: '#999' }}>No history</p>}
            {history.map((h,i)=>(
              <div key={`${h.bookId}-${i}`} style={{ display: 'flex', gap: 12, borderBottom: '1px solid #eee', padding: '12px 0', alignItems:'center' }}>
                <img src={h.cover || '/books/covers/' + (h.bookId || h.id) + '.jpg'} style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 6, border:'1px solid #eee' }} alt={h.title} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 900, fontSize: 12, lineHeight:'1.2' }}>{h.title}</p>
                  <p style={{ fontSize: 12, marginTop: 6 }}>Earned: <span style={{ fontWeight: 900, color: HOT_GREEN }}>UGX {Number(h.earned||0).toLocaleString()}</span></p>
                  <p style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{h.completedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}