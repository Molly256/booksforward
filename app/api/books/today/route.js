export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const P = 'bf:';

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')
    const date = searchParams.get('date') || getUgandaDateString()

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Missing phone' }, { status: 400 })
    }

    const userKey = `${P}user:${phone}`
    const user = await redis.hgetall(userKey)
    if (!user || !user.phone) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const setKey = `${P}books:${phone}:${date}`
    const bookIds = await redis.smembers(setKey)
    
    if (!bookIds || bookIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        date,
        setKey,
        user: {
          vip: Number(user.vip || 0),
          availableBalance: Number(user.availableBalance || 0),
          balance: Number(user.balance || 0),
          books_read_today: Number(user.books_read_today || 0),
          dailyIncome: Number(user.dailyIncome || 0),
        },
        books: [] 
      })
    }

    const bookKeys = bookIds.map(id => `${P}book:${phone}:${date}:${id}`)
    const booksData = await Promise.all(bookKeys.map(k => redis.hgetall(k)))
    
    const books = booksData
      .filter(b => b && b.bookId) 
      .map(b => ({
        bookId: String(b.bookId),
        status: b.status || 'pending',
        reward: Number(b.reward || 0),
        date: b.date || date,
        submittedAt: b.submittedAt || null,
        title: b.title || null,
        author: b.author || null,
        cover: b.cover || null
      }))

    return NextResponse.json({ 
      success: true,
      date,
      setKey,
      bookIds,
      user: {
        vip: Number(user.vip || 0),
        availableBalance: Number(user.availableBalance || 0),
        balance: Number(user.balance || 0),
        books_read_today: Number(user.books_read_today || 0),
        dailyIncome: Number(user.dailyIncome || 0),
      },
      books 
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (err) {
    console.error('GET /api/books/today error:', err)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}