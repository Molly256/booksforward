import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  cache: 'no-store' 
});

let BOOKS_MAP = null;
async function getBooksMap() {
  if (BOOKS_MAP) return BOOKS_MAP;
  const jsPath = path.join(process.cwd(), 'app', 'data.js');
  const jsonPath = path.join(process.cwd(), 'app', 'data', 'books.json');
  let ALL_BOOKS = [];
  try {
    const mod = await import(jsPath);
    const data = mod.default || mod.books || mod.BOOKS || mod;
    ALL_BOOKS = Array.isArray(data) ? data : data.books || [];
  } catch {
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(rawData);
    ALL_BOOKS = Array.isArray(parsed) ? parsed : (parsed.books || []);
  }
  BOOKS_MAP = new Map(ALL_BOOKS.map(b => [String(b.id || b._id), b]));
  return BOOKS_MAP;
}

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const date = searchParams.get('date') || getUgandaDateString();
    if (!phone) return NextResponse.json({ success: false, books: [] }, { status: 400 });

    // bf: prefix - booksforward project
    const bookIds = await redis.smembers(`bf:books:${phone}:${date}`);
    if (!bookIds?.length) {
      return NextResponse.json(
        { success: true, books: [] }, 
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const BOOKS_MAP = await getBooksMap();
    
    const pipeline = redis.pipeline();
    bookIds.forEach(id => {
      pipeline.hgetall(`bf:book:${phone}:${date}:${String(id).trim()}`);
    });
    const individualBookHashes = await pipeline.exec();

    const booksForToday = bookIds.map((id, index) => {
      const cleanId = String(id).trim();
      const b = BOOKS_MAP.get(cleanId);
      const hashData = individualBookHashes[index] || {};
      const currentStatus = hashData.status || 'pending';

      return {
        bookId: cleanId,
        title: (b ? b.title : hashData.title) || `Book ${cleanId}`,
        cover: `/books/covers/${cleanId}.jpg`,
        reward: hashData.reward || String(b?.reward || '0'),
        author: b ? b.author : 'Exclusive Author',
        preview: b ? (b.preview || b.description || '') : '',
        status: currentStatus, 
        readAt: currentStatus === 'read' || currentStatus === 'submitted' ? date : null,
        submittedAt: currentStatus === 'submitted' ? date : null,
      };
    });

    return NextResponse.json(
      { success: true, books: booksForToday }, 
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API /books/data Error:', error);
    return NextResponse.json({ success: false, books: [] }, { status: 500 });
  }
}