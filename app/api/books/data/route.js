import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const P = 'bf:';

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const date = searchParams.get('date') || getUgandaDateString();
    if (!phone) return NextResponse.json({ success: false, books: [] }, { status: 400 });

    const setKey = `${P}books:${phone}:${date}`;
    const bookIds = await redis.smembers(setKey);

    console.log(`[DATA API] ${setKey} ->`, bookIds);

    if (!bookIds?.length) {
      return NextResponse.json({ success: true, books: [] }, {
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    // Load BOOKS correctly - support bookId field
    const mod = await import('@/app/data.js');
    const ALL_BOOKS = mod.default || mod.BOOKS || mod.books || [];
    const BOOKS_MAP = new Map(
      ALL_BOOKS.map(b => [String(b.bookId || b.id || b._id), b])
    );

    const pipeline = redis.pipeline();
    bookIds.forEach(id => pipeline.hgetall(`${P}book:${phone}:${date}:${String(id).trim()}`));
    const hashes = await pipeline.exec();

    const booksForToday = bookIds.map((id, i) => {
      const cleanId = String(id).trim();
      const master = BOOKS_MAP.get(cleanId);
      const h = hashes[i] || {};

      return {
        bookId: cleanId,
        title: h.title || master?.title || `Book ${cleanId}`,
        // FIXED: use /covers/ to avoid /books route conflict
        cover: `/covers/${cleanId}.jpg`,
        reward: h.reward || '810',
        author: master?.author || 'Exclusive Author',
        preview: master?.preview || '',
        status: h.status || 'pending',
        readAt: null,
        submittedAt: null,
      };
    });

    return NextResponse.json({ success: true, books: booksForToday }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error('API /books/data Error:', e);
    return NextResponse.json({ success: false, books: [], error: e.message }, { status: 500 });
  }
}