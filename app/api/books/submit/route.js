import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const redis = Redis.fromEnv();

export const VIPS = {
  0: { books: 5, perBook: 400, price: 0 },
  1: { books: 5, perBook: 400, price: 50000 },
  2: { books: 10, perBook: 810, price: 230000 },
  3: { books: 15, perBook: 1466, price: 650000 },
  4: { books: 20, perBook: 1500, price: 850000 },
};

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function safeParse(str, fallback = []) {
  if (!str) return fallback;
  try { 
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch { 
    return fallback; 
  }
}

export async function POST(request) {
  try {
    const { phone, bookId, action } = await request.json();

    if (!phone || !bookId || !action) {
      return NextResponse.json({ error: 'Missing phone, bookId, or action' }, { status: 400 });
    }

    const today = getUgandaDateString();
    // bf: prefix - booksforward project isolation
    const bookKey = `bf:book:${phone}:${today}:${bookId}`;
    const userKey = `bf:user:${phone}`;
    const txKey = `bf:tx:${phone}:${today}`;
    const historyKey = `bf:tx:${phone}:history`;
    const incomeKey = `bf:income:${phone}:${today}`; 

    const userData = await redis.hgetall(userKey);
    if (!userData || !userData.phone) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'read') {
      const currentStatus = await redis.hget(bookKey, 'status') || null;
      if (currentStatus === 'submitted') {
        return NextResponse.json({ success: true, status: 'submitted' });
      }
      await redis.hset(bookKey, {
        status: 'read',
        readAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, status: 'read' });
    }

    if (action === 'submit') {
      const currentStatus = await redis.hget(bookKey, 'status') || null;
      if (currentStatus === 'submitted') {
        const currentBal = Number(userData.availableBalance || 0);
        return NextResponse.json({ success: true, availableBalance: currentBal, status: 'submitted' });
      }
      if (currentStatus !== 'read') {
        return NextResponse.json({ error: 'Book must be read before submitting' }, { status: 400 });
      }

      const vipLevel = Number(userData.vip || 0);
      const vipData = VIPS[vipLevel];
      if (!vipData) {
        return NextResponse.json({ error: 'VIP level configuration not open' }, { status: 403 });
      }

      const payout = vipData.perBook;
      const currentCompleted = safeParse(userData.completedBooks);
      if (!currentCompleted.includes(String(bookId))) {
        currentCompleted.push(String(bookId));
      }

      const tx = {
        id: makeId(),
        type: 'book_income', 
        amount: String(payout),
        status: 'completed',
        createdAt: String(Date.now()), 
        phone: phone,
        vipLevel: String(vipLevel),
        bookTitle: `Book ${bookId}` 
      };

      const updatedBalance = Number(userData.availableBalance || 0) + payout;
      const nextDailyCount = Number(userData.books_read_today || 0) + 1;
      const nextDailyIncome = Number(userData.dailyIncome || 0) + payout;

      await redis.hset(bookKey, { status: 'submitted', submittedAt: new Date().toISOString() });
      await redis.hset(userKey, {
        availableBalance: String(updatedBalance),
        books_read_today: String(nextDailyCount),
        dailyIncome: String(nextDailyIncome),
        completedBooks: JSON.stringify(currentCompleted)
      });

      const txString = JSON.stringify(tx);
      await redis.lpush(txKey, txString); 
      await redis.lpush(historyKey, txString); 
      await redis.lpush(incomeKey, txString); 

      return NextResponse.json({
        success: true,
        availableBalance: updatedBalance,
        status: 'submitted',
        books_read_today: nextDailyCount,
        completedBooks: currentCompleted
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })

  } catch (error) {
    console.error('API /books/submit Error:', error)
    return NextResponse.json({ error: 'Internal system failure' }, { status: 500 })
  }
}