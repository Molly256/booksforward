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

    // Get permanent transaction history - this is where submit pushes
    const historyKey = `bf:tx:${phone}:history`;
    const list = await redis.lrange(historyKey, 0, 200);

    const history = list.map(str => {
      try {
        const tx = JSON.parse(str);
        return {
          id: tx.bookId || tx.id,
          bookId: tx.bookId,
          title: tx.bookTitle || `Book ${tx.bookId}`,
          earned: Number(tx.amount || 0),
          reward: Number(tx.amount || 0),
          cover: `/books/covers/${tx.bookId}.jpg`,
          completedAt: tx.createdAt,
          status: 'submitted'
        };
      } catch { return null; }
    }).filter(Boolean);

    return NextResponse.json({ success: true, history }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: true, history: [] });
  }
}