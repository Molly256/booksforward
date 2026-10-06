export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const P = 'bf:'

const parse = s => {
  if (typeof s === 'object') return s
  try { return JSON.parse(s || 'null') } catch { return null }
}

const getUgDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
const getUgDateTime = () => new Date().toLocaleString('en-CA', { timeZone: 'Africa/Kampala', hour12: false }).replace(',', '').slice(0,19)

const dateKeyUg = (p, offset = 0) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Kampala' }))
  d.setDate(d.getDate() - offset)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${P}tx:${p}:${yyyy}-${mm}-${dd}`
}

export async function GET(req) {
  try {
    const a = req.nextUrl.searchParams.get('action')
    const ph = req.nextUrl.searchParams.get('phone')

    if (a === 'pending') {
      const keys = ph? [dateKeyUg(ph, 0), dateKeyUg(ph, 1)] : await redis.smembers(`${P}admin:pending_txs`) || []
      let list = []
      if (keys.length > 0) {
        const allLists = await Promise.all(keys.map(k => redis.lrange(k, 0, 199)))
        const deadKeys = []
        keys.forEach((k, idx) => {
          const parts = String(k || '').split(':')
          const phKey = ph || parts[1] || ''
          const items = allLists[idx] || []
          const filtered = items.map(parse).filter(t => t?.status === 'pending').map(t => ({...t, phone: t.phone || phKey }))
          if (!ph && filtered.length === 0) deadKeys.push(k)
          else list.push(...filtered)
        })
        if (deadKeys.length > 0) await redis.srem(`${P}admin:pending_txs`,...deadKeys)
      }
      const seen = new Set()
      const deduped = list.filter(t=>{ if(!t?.id || seen.has(t.id)) return false; seen.add(t.id); return true })
      return NextResponse.json({ success: true, pending: deduped }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (a === 'user') {
      if (!ph) return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })
      const u = await redis.hgetall(`${P}user:${ph}`)
      if (!u ||!u.phone) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      try { u.unlockedBooks = JSON.parse(u.unlockedBooks || '[]') } catch { u.unlockedBooks = [] }
      try { u.completedBooks = JSON.parse(u.completedBooks || '[]') } catch { u.completedBooks = [] }
      u.availableBalance = +u.availableBalance || 0
      u.vip = +u.vip || 0
      return NextResponse.json({ success: true, user: u })
    }

    if (a === 'deposit_history') {
      const today = getUgDate()
      const items = await redis.lrange(`${P}admin:deposit_history:${today}`, 0, 99)
      const parsed = items.map(parse).filter(Boolean)
      const seen = new Set()
      const deduped = parsed.filter(t=>{ if(!t?.id || seen.has(t.id)) return false; seen.add(t.id); return true })
      return NextResponse.json({ success: true, history: deduped })
    }
    if (a === 'withdraw_history') {
      const today = getUgDate()
      const items = await redis.lrange(`${P}admin:withdraw_history:${today}`, 0, 99)
      const parsed = items.map(parse).filter(Boolean)
      const seen = new Set()
      const deduped = parsed.filter(t=>{ if(!t?.id || seen.has(t.id)) return false; seen.add(t.id); return true })
      return NextResponse.json({ success: true, history: deduped })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }) }
}

export async function POST(req) {
  try {
    const { action, id, status, password, phone: ph, amount } = await req.json()

    if (action === 'updateStatus') {
      if(!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

      // LOCK 10s - stops double tap creating double history
      const lockKey = `${P}lock:tx:${id}`
      const gotLock = await redis.set(lockKey, '1', { nx: true, ex: 15 })
      if(!gotLock) return NextResponse.json({ success: false, error: 'Processing, please wait' }, { status: 429 })

      try {
        let key = null
        let p = ph

        const lookupKey = await redis.hget(`${P}tx:lookup`, id)
        if (lookupKey) key = lookupKey.startsWith(P)? lookupKey : `${P}${lookupKey}`

        if (!key && p) {
          const uKeys = [dateKeyUg(p, 0), dateKeyUg(p, 1)]
          const res = await Promise.all(uKeys.map(k => redis.lrange(k, 0, 199)))
          for (let i = 0; i < 2; i++) { if ((res[i] || []).findIndex(x => parse(x)?.id === id) > -1) { key = uKeys[i]; break; } }
        }
        if (!key) {
          const activeKeys = await redis.smembers(`${P}admin:pending_txs`) || []
          const res = await Promise.all(activeKeys.map(k => redis.lrange(k, 0, 199)))
          for (let i = 0; i < activeKeys.length; i++) { if ((res[i] || []).findIndex(x => parse(x)?.id === id) > -1) { key = activeKeys[i]; break; } }
        }

        if (!key) return NextResponse.json({ success: false, error: `Transaction not found: ${id}` }, { status: 404 })

        const items = await redis.lrange(key, 0, 199) || []
        const originalItemString = items.find(x => parse(x)?.id === id)
        if (!originalItemString) return NextResponse.json({ success: false, error: 'Transaction missing' }, { status: 404 })

        const tx = parse(originalItemString)
        if (!p) p = tx.phone || key.split(':')[1] || ''
        if (!p) return NextResponse.json({ success: false, error: 'Could not resolve phone' }, { status: 400 })
        if (tx.status!== 'pending') return NextResponse.json({ success: false, error: 'Already processed' }, { status: 400 })

        const finalStatus = String(status).toLowerCase() === 'completed'? 'success' : String(status).toLowerCase()
        const now = getUgDateTime()
        const updatedTx = {...tx, status: finalStatus, updatedAt: now, createdAt: String(tx.createdAt || now).slice(0,19), timestamp: String(tx.createdAt || now).slice(0,19)}
        const updatedTxString = JSON.stringify(updatedTx)

        // DAILY - rebuild without this id, then push once (no double)
        const dailyFiltered = items.filter(x => parse(x)?.id!== id)
        await redis.del(key)
        if(dailyFiltered.length>0){ for(const s of dailyFiltered.reverse()) await redis.lpush(key, s) }
        await redis.lpush(key, updatedTxString)

        // HISTORY - rebuild without this id, then push once (NO DOUBLE USER HISTORY)
        const hKey = `${P}tx:${p}:history`
        const hItems = await redis.lrange(hKey, 0, 500) || []
        const hFiltered = hItems.filter(x => parse(x)?.id!== id)
        await redis.del(hKey)
        for(const s of hFiltered.reverse()) await redis.lpush(hKey, s)
        await redis.lpush(hKey, updatedTxString)

        // BALANCE + ADMIN HISTORY - only if not already in admin history
        const today = getUgDate()
        const histKey = tx.type === 'deposit'? `${P}admin:deposit_history:${today}` : `${P}admin:withdraw_history:${today}`
        const existing = (await redis.lrange(histKey, 0, 99)).map(parse)
        const alreadyExists = existing.some(t=>t?.id===id)

        if(!alreadyExists){
          const amt = +String(tx.amount || 0).replace(/,/g, '')
          if (finalStatus === 'success' && tx.type === 'deposit') {
            await redis.hincrbyfloat(`${P}user:${p}`, 'availableBalance', amt)
          }
          if (finalStatus === 'failed' && tx.type === 'withdraw') {
            await redis.hincrbyfloat(`${P}user:${p}`, 'availableBalance', Math.round(amt / 0.9))
          }
          await redis.lpush(histKey, updatedTxString)
          await redis.expire(histKey, 86400)
        }

        await redis.lrem(`${P}pending_tx`, 0, id)
        await redis.hdel(`${P}tx:lookup`, id)

        const stillPending = (await redis.lrange(key, 0, 199) || []).map(parse).some(t => t?.status === 'pending')
        if (!stillPending) await redis.srem(`${P}admin:pending_txs`, key)

        return NextResponse.json({ success: true, transaction: updatedTx })
      } finally {
        await redis.del(lockKey)
      }
    }

    if (action === 'resetPassword') {
      if (!ph ||!password) return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 })
      if (!await redis.hexists(`${P}user:${ph}`, 'phone')) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      await redis.hset(`${P}user:${ph}`, { password })
      return NextResponse.json({ success: true })
    }

    if (action === 'adminDeposit') {
      if (!ph ||!amount) return NextResponse.json({ success: false, error: 'Missing phone/amount' }, { status: 400 })
      const userKey = `${P}user:${ph}`
      if (!await redis.hexists(userKey, 'phone')) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

      const amt = Number(String(amount).replace(/,/g, ''))
      if (isNaN(amt) || amt <= 0) return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })

      await redis.hincrbyfloat(userKey, 'availableBalance', amt)

      const dateStr = getUgDate()
      const timeStr = getUgDateTime()
      const tx = {
        id: `tx_${Date.now()}_sys_${Math.random().toString(36).slice(2,6)}`,
        type: 'system_increase',
        label: 'System Increase',
        amount: String(amt),
        status: 'success',
        createdAt: timeStr,
        timestamp: timeStr,
        phone: ph,
        note: 'Admin deposit'
      }
      const txStr = JSON.stringify(tx)
      await redis.lpush(`${P}tx:${ph}:${dateStr}`, txStr)
      await redis.lpush(`${P}tx:${ph}:history`, txStr)
      await redis.lpush(`${P}admin:deposit_history:${dateStr}`, txStr)
      await redis.expire(`${P}admin:deposit_history:${dateStr}`, 86400)

      const user = await redis.hgetall(userKey)
      return NextResponse.json({ success: true, user })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }) }
}