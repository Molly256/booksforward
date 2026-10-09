import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const redis = Redis.fromEnv();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ success: true, history: [] });

    const historyKey = `bf:tx:${phone}:history`;
    const list = await redis.lrange(historyKey, 0, 500);

    const history = [];
    const seen = new Set();

    for (const str of list) {
      try {
        const tx = JSON.parse(str);

        // === TASK HISTORY FILTER - ONLY DAILY INCOME TAB ===
        if (tx.type !== 'daily income') continue; // hide deposit 50000, withdraw, vip purchase
        if (!tx.bookId || tx.bookId === 'undefined' || tx.bookId === '') continue; // hide Book undefined

        const uniq = `${tx.bookId}-${tx.createdAt}`;
        if (seen.has(uniq)) continue;
        seen.add(uniq);

        history.push({
          id: tx.bookId,
          bookId: tx.bookId,
          title: tx.bookTitle || tx.title || `Book ${tx.bookId}`, // real title
          earned: Number(tx.amount || 0),
          cover: `/books/covers/${tx.bookId}.jpg`,
          completedAt: tx.createdAt,
          status: 'submitted'
        });
      } catch {}
    }

    history.sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''));

    return NextResponse.json({ success: true, history }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: true, history: [] });
  }
}