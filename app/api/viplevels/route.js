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
  const jsPath = path.join(process.cwd(), 'app/data.js');
  let allBooks = [];
  try {
    delete require.cache[require.resolve(jsPath)];
    const mod = require(jsPath);
    allBooks = mod.default || mod.books || mod;
    if (!Array.isArray(allBooks)) allBooks = [];
  } catch {}

  try {
    const coversPath = path.join(process.cwd(), 'public/books/covers');
    if (fs.existsSync(coversPath)) {
      const files = fs.readdirSync(coversPath);
      if (files.length > 0) {
        const coverIds = new Set(files.map(f => f.replace(/\.jpg$/i, '')));
        const filtered = allBooks.filter(b => coverIds.has(String(b.id || b._id)));
        if (filtered.length > 0) {
          CACHED_VALID_BOOKS = filtered;
          return CACHED_VALID_BOOKS;
        }
      }
    }
  } catch {}

  CACHED_VALID_BOOKS = allBooks;
  return CACHED_VALID_BOOKS;
}

function pickRandomBooks(count) {
  const pool = getValidBooksCached();
  if (!pool.length) return [];
  const result = [], chosen = new Set(), n = Math.min(count, pool.length);
  while (chosen.size < n) {
    const i = Math.floor(Math.random() * pool.length);
    if (!chosen.has(i)) { chosen.add(i); result.push(pool[i]); }
  }
  return result;
}

const getUgandaDateString = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
const getUgandaDateTimeString = () => new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0, 16).replace(',', ' ');

function assignBooksToUser(phone, vipLevel, today, pipeline) {
  const selectedVip = VIPS[vipLevel];
  const validBooks = pickRandomBooks(selectedVip.books);
  if (!validBooks.length) {
    return { unlockedBooks: [], assignedBooksMeta: [] };
  }
  validBooks.forEach(b => {
    const id = String(b.id || b._id);
    pipeline.hset(P + 'book:' + phone + ':' + today + ':' + id, {
      phone, bookId: id, vipLevel: String(vipLevel), reward: String(selectedVip.perBook),
      title: b.title, cover: '/books/covers/' + id + '.jpg', status: 'pending', date: today, createdAt: String(Date.now())
    });
    pipeline.sadd(P + 'books:' + phone + ':' + today, id);
  });
  return {
    unlockedBooks: validBooks.map(b => String(b.id || b._id)),
    assignedBooksMeta: validBooks.map(b => ({ id: String(b.id || b._id), title: b.title, cover: '/books/covers/' + (b.id || b._id) + '.jpg', reward: selectedVip.perBook }))
  };
}

export async function GET() {
  return NextResponse.json({ success: true, levels: Object.keys(VIPS).map(k => ({ level: Number(k),...VIPS[k] })) });
}

export async function POST(req) {
  try {
    const body = await req.json(), phone = body.phone, action = body.action, payload = body.payload;
    if (!phone || (action!== 'UPGRADE' && action!== 'BUY_VIP')) return NextResponse.json({ success: false, message: 'Missing data' }, { status: 400 });

    const vipLevel = payload?.vipLevel;
    if (vipLevel === undefined ||!VIPS[vipLevel] || vipLevel > 4) return NextResponse.json({ success: false, message: 'Invalid level' }, { status: 400 });

    const userKey = P + 'user:' + phone, user = await redis.hgetall(userKey);
    if (!user ||!user.phone) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    const currentVip = Number(user.vip || 0);
    const dateStr = getUgandaDateString(), timeStr = getUgandaDateTimeString(), historyKey = P + 'tx:' + phone + ':history', pipeline = redis.pipeline();
    const ugDay = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" })).getDay();
    const isSunday = ugDay === 0;

    if (vipLevel === 0) {
      if (user.vipActivated === 'true' || user.vipActivated === true) {
        return NextResponse.json({ success: false, message: 'Vip0 already activated' }, { status: 400 });
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

    if (vipLevel <= currentVip && (user.hasBoughtVip === 'true' || user.hasBoughtVip === true)) {
      return NextResponse.json({ success: false, message: 'Already owned' }, { status: 400 });
    }
    const upgradeCost = VIPS[vipLevel].price;
    if (Number(user.availableBalance || 0) < upgradeCost) {
      return NextResponse.json({ success: false, message: 'Insufficient Balance' }, { status: 400 });
    }
    const isFirst = user.hasBoughtVip!== 'true' && user.hasBoughtVip!== true;

    let unlockedBooks = [], assignedBooksMeta = [];
    if (!isSunday) {
      const assignResult = assignBooksToUser(phone, vipLevel, dateStr, pipeline);
      unlockedBooks = assignResult.unlockedBooks;
      assignedBooksMeta = assignResult.assignedBooksMeta;
    }

    pipeline.lpush(historyKey, JSON.stringify({ id: 'up_' + Date.now(), type: 'upgrade_vip', amount: String(-upgradeCost), note: 'Vip' + vipLevel + ' Upgrade', status: 'success', createdAt: timeStr }));
    pipeline.hincrby(userKey, 'spins', 1);
    pipeline.hset(userKey, {
      vip: String(vipLevel),
      vipPricePaid: String(upgradeCost),
      availableBalance: String(Number(user.availableBalance || 0) - upgradeCost),
      hasBoughtVip: 'true',
      vipActivated: 'true',
      vipExpiry: new Date(Date.now() + (VIPS[vipLevel].days*24*60*60*1000)).toISOString(),
      unlockedBooks: JSON.stringify(unlockedBooks),
      completedBooks: '[]',
      books_read_today: '0',
      dailyIncome: '0',
      lastResetDate: dateStr,
      vip_bought_date: dateStr
    });
    await pipeline.exec();
    if (isFirst) await processHierarchicalCommissions(phone, vipLevel);
    const updated = await redis.hgetall(userKey);
    return NextResponse.json({ success: true, user: updated, books: assignedBooksMeta, isSunday });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Upgrade failed, please try again' }, { status: 500 });
  }
}

async function processHierarchicalCommissions(buyerPhone, buyerVipLevel) {
  try {
    const vipAmts = { 0: 0, 1: 50000, 2: 230000, 3: 650000, 4: 850000 };
    const timeStr = new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0, 16).replace(',', ' ');
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
    const cp = redis.pipeline(); let hasOps = false;
    for (let i = 0; i < 3; i++) {
      const up = chain[i]; if (!up) continue;
      const ud = uplineData[i] || {};
      if (ud.hasBoughtVip!== 'true' && ud.hasBoughtVip!== true) continue;
      const reward = Math.floor((vipAmts[Math.min(Number(ud.vip||0), buyerVipLevel)] || 0) * rates[i]);
      if (reward > 0) {
        hasOps = true;
        cp.lpush(P + 'tx:' + up + ':history', JSON.stringify({ id: 'tx_' + Date.now() + '_' + labels[i] + '_' + Math.random().toString(36).slice(2,5), type: typeFlags[i], label: 'commission', amount: String(reward), note: 'Invitation Rewards (Team ' + labels[i] + ': ' + buyerPhone + ')', status: 'success', createdAt: timeStr }));
        cp.hincrby(P + 'user:' + up, 'availableBalance', reward);
        if (i === 0) cp.hincrby(P + 'user:' + up, 'spins', 1);
      }
    }
    if (hasOps) await cp.exec();
  } catch {}
}