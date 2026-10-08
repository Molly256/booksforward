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

    // 1. permanent history
    const historyKey = `bf:tx:${phone}:history`;
    const permanent = await redis.lrange(historyKey, 0, 200);

    // 2. also check today's tx (for old data before fix)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
    const todayKey = `bf:tx:${phone}:${today}`;
    const todayList = await redis.lrange(todayKey, 0, 200);

    // Merge & deduplicate by id
    const allRaw = [...permanent, ...todayList];
    const seen = new Set();
    const history = [];

    for (const str of allRaw) {
      try {
        const tx = typeof str === 'string' ? JSON.parse(str) : str;
        const uniq = tx.id || `${tx.bookId}-${tx.createdAt}`;
        if (seen.has(uniq)) continue;
        seen.add(uniq);
        history.push({
          id: tx.bookId || tx.id,
          bookId: tx.bookId,
          title: tx.bookTitle || `Book ${tx.bookId}`,
          earned: Number(tx.amount || 0),
          reward: Number(tx.amount || 0),
          cover: `/books/covers/${tx.bookId}.jpg`,
          completedAt: tx.createdAt,
          status: 'submitted'
        });
      } catch {}
    }

    // Sort newest first
    history.sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''));

    return NextResponse.json({ success: true, history }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: true, history: [] });
  }
}