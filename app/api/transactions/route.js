export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const P = 'bf:'

const getLabel = (tx) => {
  const t = String(tx.type || '').toLowerCase().trim()
  if (t === 'buy_vip' || t === 'vip') return `VIP ${tx.vipLevel || ''} Purchase`.trim()
  if (t === 'deposit') return 'Deposit'
  if (t === 'withdraw') return 'Withdraw'
  if (t === 'refund_vip') return 'VIP Refund'
  if (t === 'daily_income' || t === 'book_income') return 'Daily Income'
  if (t === 'team_a_payout') return 'Team A Direct Commission'
  if (t === 'team_b_payout') return 'Team B Indirect Commission'
  if (t === 'team_c_payout') return 'Team C Indirect Commission'
  if (t === 'commission') return 'Team Commission'
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
  return new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0,16).replace(',', '');
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

    // BLOCK system_increase completely
    if (cleanType === 'system_increase' || cleanType === 'registration_reward') {
      return NextResponse.json({ error: 'Transaction type disabled' }, { status: 400 })
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
    const timeStr = getUgandaDateTimeString();

    const tx = { id, type: cleanType, label: getLabel({type: cleanType, vipLevel}), amount: String(amount), status, createdAt: timeStr, phone, method: method || '', withdrawPhone: withdrawPhone || '', withdrawName: withdrawName || '', bookTitle: bookTitle || '', vipLevel: String(vipLevel || ''), note: note || '' }

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

      // REMOVE shares + system_increase + registration rewards
      if (uiType.includes('share')) continue;
      if (uiType === 'system_increase' || uiType === 'registration_reward') continue;

      if (uiType === 'buy_vip') uiType = 'vip'
      if (uiType === 'daily_income' || uiType === 'book_income') uiType = 'daily income'

      transactions.push({
        id: String(tx.id), type: uiType, label: tx.label || getLabel(tx), amount: String(tx.amount), note: tx.note || '', status: (tx.status === 'completed' || tx.status === 'success')? 'success' : tx.status, createdAt: tx.createdAt, phone: tx.phone || phone, method: tx.method || '', withdrawPhone: tx.withdrawPhone || '', withdrawName: tx.withdrawName || '', bookTitle: tx.bookTitle || '', vipLevel: tx.vipLevel || ''
      });
    }
    return NextResponse.json({ success: true, availableBalance, transactions }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}