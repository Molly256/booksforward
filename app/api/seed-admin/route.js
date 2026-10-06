import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
const redis = Redis.fromEnv();

export async function GET() {
  const phone = '0753520252';
  const exists = await redis.hget('user:' + phone, 'phone');
  if (exists) {
    return NextResponse.json({ 
      success: true, 
      message: 'Admin already exists', 
      inviteCode: phone,
      username: 'Admin256'
    });
  }

  await redis.hset('user:' + phone, {
    phone: '0753520252',
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
    vip_bought_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' }),
    lastResetDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' }),
    isAdmin: 'true',
    createdAt: new Date().toISOString()
  });
  
  await redis.sadd('all_users', phone);

  return NextResponse.json({ 
    success: true, 
    message: 'Admin created successfully',
    inviteCode: '520252BF',
    login: { phone: '0753520252', username: 'Admin256', password: 'Admin4' }
  });
}