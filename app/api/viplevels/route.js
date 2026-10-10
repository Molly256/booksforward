export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const redis = Redis.fromEnv();
const P = 'bf:';

export const VIPS = {
  0: { books: 5, perBook: 400, price: 0, days: 1 },
  1: { books: 5, perBook: 400, price: 50000, days: 365 },
  2: { books: 10, perBook: 810, price: 230000, days: 365 },
  3: { books: 15, perBook: 1466, price: 650000, days: 365 },
  4: { books: 20, perBook: 1500, price: 850000, days: 365 },
};

let CACHED_VALID_BOOKS = null;

function getValidBooksCached() {
  if (CACHED_VALID_BOOKS) return CACHED_VALID_BOOKS;
  try {
    const jsPath = path.join(process.cwd(), 'app/data.js');
    delete require.cache[require.resolve(jsPath)];
    const mod = require(jsPath);
    const allBooks = mod.default || mod.books || mod;
    const arr = Array.isArray(allBooks)? allBooks : [];

    const coversPath = path.join(process.cwd(), 'public/books/covers');
    const coverIds = new Set(fs.readdirSync(coversPath).map(f => f.replace(/\.jpg$/i, '')));
    CACHED_VALID_BOOKS = arr.filter(b => coverIds.has(String(b.id || b._id)));
    if (CACHED_VALID_BOOKS.length === 0) CACHED_VALID_BOOKS = arr;
    return CACHED_VALID_BOOKS;
  } catch (err) {
    return [];
  }
}

function pickRandomBooks(count) {
  const pool = getValidBooksCached();
  if (pool.length === 0) return [];
  const result = [], chosenIndices = new Set(), actualCount = Math.min(count, pool.length);
  while (chosenIndices.size < actualCount) {
    const randIdx = Math.floor(Math.random() * pool.length);
    if (!chosenIndices.has(randIdx)) {
      chosenIndices.add(randIdx);
      result.push(pool[randIdx]);
    }
  }
  return result;
}

const safeParse = (s, f = []) => (!s? f : typeof s === 'object'? s : JSON.parse(s));
const getUgandaDateString = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
const getUgandaDateTimeString = () => new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0, 16).replace(',', ' ');

function assignBooksToUser(phone, vipLevel, today, pipeline) {
  const selectedVip = VIPS[vipLevel];
  const validBooks = pickRandomBooks(selectedVip.books);
  if (validBooks.length === 0) throw new Error('No books found');

  validBooks.forEach(b => {
    const bid = String(b.id || b._id);
    pipeline.hset(P + 'book:' + phone + ':' + today + ':' + bid, {
      phone, bookId: bid, vipLevel: String(vipLevel), reward: String(selectedVip.perBook),
      title: b.title, cover: '/books/covers/' + bid + '.jpg', status: 'pending', date: today, createdAt: String(Date.now())
    });
    pipeline.sadd(P + 'books:' + phone + ':' + today, bid);
  });

  return {
    unlockedBooks: validBooks.map(b => String(b.id || b._id)),
    assignedBooksMeta: validBooks.map(b => ({ id: String(b.id || b._id), title: b.title, cover: '/books/covers/' + (b.id || b._id) + '.jpg', reward: selectedVip.perBook }))
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (phone) {
    const user = await redis.hgetall(P + 'user:' + phone);
    if (!user?.phone) return NextResponse.json({ success: false }, { status: 404 });
    return NextResponse.json({ success: true, user });
  }
  return NextResponse.json({ success: true, levels: Object.keys(VIPS).map(k => Object.assign({ level: Number(k) }, VIPS[k])) });
}

export async function POST(req) {
  try {
    const body = await req.json(), phone = body.phone, action = body.action, payload = body.payload;
    if (!phone || (action!== 'UPGRADE' && action!== 'BUY_VIP')) return NextResponse.json({ success: false, message: 'Missing data' }, { status: 400 });

    const vipLevel = payload?.vipLevel;
    if (vipLevel === undefined ||!VIPS[vipLevel] || vipLevel > 4) return NextResponse.json({ success: false, message: 'Invalid level' }, { status: 400 });

    const userKey = P + 'user:' + phone, user = await redis.hgetall(userKey);
    if (!user ||!user.phone) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    const dateStr = getUgandaDateString(), timeStr = getUgandaDateTimeString(), historyKey = P + 'tx:' + phone + ':history', pipeline = redis.pipeline();
    const ugDay = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" })).getDay(); // 0=Sun
    const isSunday = ugDay === 0;

    // Vip0: user with no vip taps vip0 -> seed 5 books, hasBoughtVip stays false, only vipActivated true, any day
    if (vipLevel === 0) {
      if (user.vipActivated === 'true' || user.vipActivated === true) {
        return NextResponse.json({ success: false, message: 'Vip0 already activated' }, { status: 400 });
      }
      if (Number(user.vip || 0) > 0 && (user.hasBoughtVip === 'true' || user.hasBoughtVip === true)) {
        return NextResponse.json({ success: false, message: "Can't downgrade" }, { status: 400 });
      }
      const assignResult = assignBooksToUser(phone, 0, dateStr, pipeline);
      pipeline.hset(userKey, {
        vip: '0',
        vipActivated: 'true',
        hasBoughtVip: 'false',
        vipExpiry: new Date(Date.now() + 1*24*60*60*1000).toISOString(),
        unlockedBooks: JSON.stringify(assignResult.unlockedBooks),
        completedBooks: '[]',
        books_read_today: '0',
        dailyIncome: '0',
        lastResetDate: dateStr,
        vip_bought_date: dateStr
      });
      pipeline.hincrby(userKey, 'spins', 1);
      await pipeline.exec();
      const updatedUser = await redis.hgetall(userKey);
      return NextResponse.json({ success: true, user: updatedUser, books: assignResult.assignedBooksMeta });
    }

    // Vip1-4
    const currentVip = Number(user.vip || 0);
    if (vipLevel <= currentVip && vipLevel!== 0) return NextResponse.json({ success: false, message: "Can't downgrade" }, { status: 400 });

    const upgradeCost = VIPS[vipLevel].price;
    const currentBalance = Number(user.availableBalance || 0);
    if (currentBalance < upgradeCost) {
      return NextResponse.json({ success: false, message: 'Insufficient Balance' }, { status: 400 });
    }

    const isFirst = user.hasBoughtVip!== 'true' && user.hasBoughtVip!== true;

    let unlockedBooks = [], assignedBooksMeta = [];
    if (isSunday) {
      // Sunday: upgrade successful for vip1-4 gets vip + hasBoughtVip true but never seed books
      unlockedBooks = [];
      assignedBooksMeta = [];
    } else {
      // Mon-Sat: seed immediately
      const assignResult = assignBooksToUser(phone, vipLevel, dateStr, pipeline);
      unlockedBooks = assignResult.unlockedBooks;
      assignedBooksMeta = assignResult.assignedBooksMeta;
    }

    let newBalance = currentBalance - upgradeCost;

    pipeline.lpush(historyKey, JSON.stringify({ id: 'up_' + Date.now(), type: 'upgrade_vip', amount: String(-upgradeCost), note: 'Vip' + vipLevel + ' Upgrade', status: 'success', createdAt: timeStr }));
    pipeline.hincrby(userKey, 'spins', 1);

    const expiryDays = VIPS[vipLevel].days;
    pipeline.hset(userKey, {
      vip: String(vipLevel),
      vipPricePaid: String(upgradeCost),
      availableBalance: String(newBalance),
      hasBoughtVip: 'true',
      vipActivated: 'true',
      vipExpiry: new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000)).toISOString(),
      unlockedBooks: JSON.stringify(unlockedBooks),
      completedBooks: '[]',
      books_read_today: '0',
      dailyIncome: '0',
      lastResetDate: dateStr,
      vip_bought_date: dateStr
    });

    await pipeline.exec();
    if (isFirst) await processHierarchicalCommissions(phone, vipLevel);

    const updatedUser = await redis.hgetall(userKey);
    return NextResponse.json({ success: true, user: updatedUser, books: assignedBooksMeta, isSunday });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

async function processHierarchicalCommissions(buyerPhone, buyerVipLevel) {
  try {
    const vipAmts = { 0: 0, 1: 50000, 2: 230000, 3: 650000, 4: 850000 };
    const timeStr = getUgandaDateTimeString();
    const rates = [0.10, 0.03, 0.01], labels = ['A', 'B', 'C'], typeFlags = ['team_a_payout', 'team_b_payout', 'team_c_payout'];

    const parent = await redis.hget(P + 'user:' + buyerPhone, 'invited_by');
    if (!parent ||!/^07\d{8}$/.test(String(parent).trim())) return;
    const cleanParent = String(parent).trim();

    const grandparent = await redis.hget(P + 'user:' + cleanParent, 'invited_by');
    const cleanGrandparent = grandparent && /^07\d{8}$/.test(String(grandparent).trim())? String(grandparent).trim() : null;

    let greatGrandparent = null;
    if (cleanGrandparent) {
      const ggrand = await redis.hget(P + 'user:' + cleanGrandparent, 'invited_by');
      greatGrandparent = ggrand && /^07\d{8}$/.test(String(ggrand).trim())? String(ggrand).trim() : null;
    }

    const chain = [cleanParent, cleanGrandparent, greatGrandparent];
    const uplineData = await Promise.all(chain.map(p => p? redis.hmget(P + 'user:' + p, 'vip', 'hasBoughtVip') : Promise.resolve(null)));
    const commissionPipeline = redis.pipeline();
    let hasQueuedOps = false;

    for (let i = 0; i < 3; i++) {
      const uplinePhone = chain[i];
      if (!uplinePhone) continue;
      const userData = uplineData[i] || {}, uplineVip = Number(userData.vip || 0), hasBoughtVipStatus = userData.hasBoughtVip;
      if (hasBoughtVipStatus!== 'true' && hasBoughtVipStatus!== true) continue;
      if (uplineVip >= 0) {
        const reward = Math.floor((vipAmts[Math.min(uplineVip, buyerVipLevel)] || 0) * rates[i]);
        if (reward > 0) {
          hasQueuedOps = true;
          commissionPipeline.lpush(P + 'tx:' + uplinePhone + ':history', JSON.stringify({
            id: 'tx_' + Date.now() + '_' + labels[i] + '_' + Math.random().toString(36).slice(2, 5),
            type: typeFlags[i], label: 'commission', amount: String(reward), note: 'Invitation Rewards (Team ' + labels[i] + ': ' + buyerPhone + ')', status: 'success', createdAt: timeStr
          }));
          commissionPipeline.hincrby(P + 'user:' + uplinePhone, 'availableBalance', reward);
          if (i === 0) {
            commissionPipeline.hincrby(P + 'user:' + uplinePhone, 'spins', 1);
          }
        }
      }
    }
    if (hasQueuedOps) await commissionPipeline.exec();
  } catch (err) {}
}