import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
// YOUR DATA PATH: app/data.js
import { BOOKS } from '../../../data.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const redis = Redis.fromEnv();

// VIP REWARD TABLE - amount per book based on VIP level
const VIP_REWARDS = {
  0: 400,
  1: 400,
  2: 810,
  3: 1466,
  4: 1500,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ success: true, history: [] });

    // 1. GET USER VIP LEVEL FROM REDIS
    let vipLevel = 0;
    try {
      const userRaw = await redis.get(`bf:user:${phone}`);
      if (userRaw) {
        const u = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
        vipLevel = Number(u.vip ?? u.vipLevel ?? 0);
      }
    } catch {}

    const rewardPerBook = VIP_REWARDS[vipLevel] ?? 400;

    // 2. BUILD TITLE MAP FROM app/data.js
    const TITLE_MAP = new Map();
    if (Array.isArray(BOOKS)) {
      for (const b of BOOKS) {
        TITLE_MAP.set(String(b.bookId || b.id), b.title);
      }
    }

    // 3. FETCH ALL bookId FROM REDIS FOR THIS USER
    const historyKey = `bf:tx:${phone}:history`;
    const list = await redis.lrange(historyKey, 0, 500);

    const history = [];
    const seen = new Set();

    for (const str of list) {
      try {
        const tx = JSON.parse(str);
        if (tx.type !== 'daily income') continue;

        const bookId = String(tx.bookId || '').trim();
        if (!bookId || bookId === 'undefined' || bookId === '') continue;

        const uniq = `${bookId}-${String(tx.createdAt).slice(0,10)}`;
        if (seen.has(uniq)) continue;
        seen.add(uniq);

        // 4. EXACT TITLE FROM app/data.js
        const exactTitle = TITLE_MAP.get(bookId) || tx.bookTitle || tx.title || `Book ${bookId}`;
        
        // 5. EXACT COVER FROM public/books/covers/{bookId}.jpg
        const exactCover = `/books/covers/${bookId}.jpg`;

        // 6. AMOUNT BASED ON VIP LEVEL USER IS ON
        const earned = rewardPerBook;

        history.push({
          id: bookId,
          bookId,
          title: exactTitle,
          earned,
          cover: exactCover,
          completedAt: tx.createdAt,
          vipLevel,
          status: 'submitted'
        });
      } catch {}
    }

    history.sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''));

    return NextResponse.json({ success: true, history }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error('history error', e);
    return NextResponse.json({ success: true, history: [] });
  }
}