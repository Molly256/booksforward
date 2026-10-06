import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
const redis = Redis.fromEnv();

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const phone = '0753520252';
    const userKey = 'bf:user:' + phone;
    
    const exists = await redis.hget(userKey, 'phone');
    if (exists) {
      return NextResponse.json({ 
        success: true, 
        message: 'Admin already exists - FIXED KEY',
        phone,
        inviteCode: '520252BF'
      });
    }

    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });

    await redis.hset(userKey, {
      phone: phone,
      username: 'Admin256',
      password: 'Admin4',
      vip: '4',
      vipPricePaid: '850000',
      availableBalance: '4000',
      hasBoughtVip: 'true',
      invited_by: '',
      inviteCode: '520252BF',
      spins: '100',
      unlockedBooks: '[]',
      completedBooks: '[]',
      books_read_today: '0',
      dailyIncome: '0',
      vipExpiry: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      vip_bought_date: date,
      lastResetDate: date,
      isAdmin: 'true',
      createdAt: new Date().toISOString()
    });
    
    // THIS WAS MISSING - login needs this to find invite code
    await redis.set('bf:invite_code_map:520252BF', phone);
    await redis.set('bf:invite_code_map:352025BF', phone); // also add phone-based code
    await redis.sadd('bf:all_users', phone);
    await redis.set('bf:admin:' + phone, '1');

    return NextResponse.json({ 
      success: true, 
      message: 'Admin created with bf: prefix - NOW WILL LOGIN',
      inviteCode: '520252BF',
      login: { phone: '0753520252', password: 'Admin4' }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}