import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
const redis = Redis.fromEnv();

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const phone = '0753520252';
    const userKey = 'bf:user:' + phone;
    
    // Delete old wrong data first to force correct data
    // await redis.del(userKey);

    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });

    // THIS MUST MATCH api/auth admin data
    await redis.hset(userKey, {
      phone: '0753520252',
      username: 'Admin256',
      password: 'Admin4',
      inviteCode: '520252BF',
      isAdmin: 'true',
      availableBalance: '6000',
      vip: '2',
      hasBoughtVip: 'true',
      vipPricePaid: '0',
      books_read_today: '0',
      dailyIncome: '0',
      spins: '0',
      completedBooks: '[]',
      unlockedBooks: '[]',
      lastResetDate: date,
      createdAt: date,
      invited_by: ''
    });
    
    // These 2 are required for login + invite to work
    await redis.set('bf:invite_code_map:520252BF', phone);
    await redis.set('bf:invite_code_map:352025BF', phone);
    await redis.sadd('bf:all_users', phone);

    const check = await redis.hgetall(userKey);

    return NextResponse.json({ 
      success: true, 
      message: 'Admin FIXED and now matches api/auth',
      admin: {
        username: check.username,
        phone: check.phone,
        password: check.password,
        inviteCode: check.inviteCode,
        availableBalance: check.availableBalance,
        vip: check.vip,
        isAdmin: check.isAdmin
      },
      login: { phone: '0753520252', password: 'Admin4' }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}