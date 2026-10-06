import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
const redis = Redis.fromEnv();

export async function GET() {
  try {
    await redis.set('test_connection', 'ok');
    const val = await redis.get('test_connection');
    return NextResponse.json({ success: true, connected: true, value: val, url: !!process.env.UPSTASH_REDIS_REST_URL });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message, envExists: !!process.env.UPSTASH_REDIS_REST_URL });
  }
}
