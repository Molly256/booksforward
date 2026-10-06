export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const P = 'bf:'

const getLabel = (tx) => {
  const t = String(tx.type || '').toLowerCase().trim()
  if (t === 'buy_vip' || t === 'vip') return `VIP ${tx.vipLevel || ''} Purchase`.trim()
  if (t === 'deposit' || t === 'system increase') return t === 'system increase' ? 'SYSTEM INCREASE' : 'Deposit'
  if (t === 'withdraw') return 'Withdraw'
  if (t === 'refund_vip') return 'VIP Refund'
  if (t === 'daily_income' || t === 'book_income' || t === 'daily income') return 'Daily Income'
  if (t === 'team_a_payout') return 'Team A Commission'
  if (t === 'team_b_payout') return 'Team B Commission'
  if (t === 'team_c_payout') return 'Team C Commission'
  if (t === 'commission' || t === 'team' || t === 'myteam' || t === 'invite') return 'Team Commission'
  if (t === 'wheel' || t === 'lucky wheel' || t === 'magical wheel' || t === 'lucky_wheel' || t === 'magical_wheel') return 'Magical Wheel'
  return tx.type? tx.type.replace(/_/g,' ').toUpperCase() : 'Transaction'
}

const safeParse = (s) => {
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return null }
}

function getUgandaDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' });
}
function getUgandaDateTimeString() {
  // FIXED: YYYY-MM-DD HH:mm:ss with hour-minute-seconds
  return new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).replace(',', '').slice(0,19);
}
function getUgandaNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Kampala" }));
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { type, phone, amount, method, withdrawPhone, withdrawName, bookTitle, vipLevel, id: customId, note } = body
    if (!type ||!phone ||!amount) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const cleanType = String(type).toLowerCase().trim()

    // Allow system_increase ONLY if coming from admin (block for normal users)
    // Normal users cannot spoof it, but admin route uses direct redis push
    if (cleanType === 'system_increase' || cleanType === 'registration_reward') {
      // Keep blocked for user-facing POST - admin uses /api/admin
      return NextResponse.json({ error: 'Transaction type disabled' }, { status: 400 })
    }
    if (cleanType.includes('share')) {
      return NextResponse.json({ error: 'Shares disabled' }, { status: 400 })
    }

    let amt = Number(amount)
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 })

    const isWithdrawal = cleanType === 'withdraw'

    if (isWithdrawal) {
      const ugandaDate = getUgandaNow();
      const day = ugandaDate.getDay()
      if (day === 0 || day === 6) return NextResponse.json({ error: 'No withdraw on weekends! Monday to Friday only.' }, { status: 400 })
      const totalSec = ugandaDate.getHours()*3600 + ugandaDate.getMinutes()*60 + ugandaDate.getSeconds()
      if (totalSec < 11*3600 || totalSec >= 18*3600) return NextResponse.json({ error: 'Withdrawals only open 11:00 AM - 6:00 PM Ugandan Time.' }, { status: 400 })
    }

    const userKey = `${P}user:${phone}`
    const grossDeduction = isWithdrawal? Math.round(amt / 0.9) : amt

    if (isWithdrawal) {
      const currentAvailableBalance = Number(await redis.hget(userKey, 'availableBalance') || 0)
      if (grossDeduction > currentAvailableBalance) return NextResponse.json({ error: 'Insufficient availableBalance' }, { status: 400 })
      await redis.hincrby(userKey, 'availableBalance', -grossDeduction)
    }

    const id = customId || `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`
    let status = 'success'
    if (cleanType === 'deposit' || isWithdrawal) status = 'pending'

    const dateStr = getUgandaDateString();
    const timeStr = getUgandaDateTimeString(); // YYYY-MM-DD HH:mm:ss

    const tx = { 
      id, 
      type: cleanType === 'lucky wheel' ? 'magical wheel' : cleanType === 'myteam' ? 'team' : cleanType, 
      label: getLabel({type: cleanType, vipLevel}), 
      amount: String(amount), 
      status, 
      createdAt: timeStr, 
      timestamp: timeStr,
      updatedAt: timeStr,
      phone, 
      method: method || '', 
      withdrawPhone: withdrawPhone || '', 
      withdrawName: withdrawName || '', 
      bookTitle: bookTitle || '', 
      vipLevel: String(vipLevel || ''), 
      note: note || '' 
    }

    const txString = JSON.stringify(tx)
    const dayKey = `${P}tx:${phone}:${dateStr}`
    const historyKey = `${P}tx:${phone}:history`

    const pipeline = redis.pipeline()
    pipeline.lpush(dayKey, txString)
    pipeline.lpush(historyKey, txString)
    if (status === 'pending') {
      pipeline.sadd(`${P}admin:pending_txs`, dayKey)
      pipeline.lpush(`${P}pending_tx`, id)
    }
    await pipeline.exec()
    return NextResponse.json({ success: true, transaction: tx })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const historyKey = `${P}tx:${phone}:history`
    const userKey = `${P}user:${phone}`

    const [userHashResult, rawItemsResult] = await Promise.all([
      redis.hgetall(userKey),
      redis.lrange(historyKey, 0, 499)
    ])

    const userHash = userHashResult || {}
    const rawItems = rawItemsResult || []
    const availableBalance = Number(userHash.availableBalance || 0)

    const transactions = [];
    const seenIds = new Set();
    for (const raw of rawItems) {
      const tx = safeParse(raw);
      if (!tx ||!tx.id) continue;
      if (seenIds.has(tx.id)) continue;
      seenIds.add(tx.id);

      let uiType = String(tx.type || '').toLowerCase().trim();

      // REMOVE only shares - KEEP system_increase for admin deposits
      if (uiType.includes('share')) continue;
      if (uiType === 'registration_reward') continue;

      if (uiType === 'buy_vip') uiType = 'vip'
      if (uiType === 'daily_income' || uiType === 'book_income') uiType = 'daily income'
      if (uiType === 'lucky wheel' || uiType === 'lucky_wheel' || uiType === 'wheel') uiType = 'magical wheel'
      if (uiType === 'myteam') uiType = 'team'
      if (uiType === 'system_increase') uiType = 'system increase' // keep visible

      // ensure YYYY-MM-DD HH:mm:ss
      let created = tx.createdAt || tx.timestamp || getUgandaDateTimeString()
      created = String(created).slice(0,19)

      transactions.push({
        id: String(tx.id), 
        type: uiType, 
        label: tx.label || getLabel({...tx, type: uiType}), 
        amount: String(tx.amount), 
        note: tx.note || '', 
        status: (tx.status === 'completed' || tx.status === 'success')? 'success' : tx.status, 
        createdAt: created,
        timestamp: created,
        updatedAt: tx.updatedAt || created,
        phone: tx.phone || phone, 
        method: tx.method || '', 
        withdrawPhone: tx.withdrawPhone || '', 
        withdrawName: tx.withdrawName || '', 
        bookTitle: tx.bookTitle || '', 
        vipLevel: tx.vipLevel || ''
      });
    }
    return NextResponse.json({ success: true, availableBalance, transactions }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}