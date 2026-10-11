export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const toNum = (v, f = 0) => {
  if (v === undefined || v === null) return f;
  const n = Number(v);
  return Number.isNaN(n) ? f : n;
};

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    if (!phone || !/^07\d{8}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Valid phone parameter is required' }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();

    // 1. Fetch downlines - bf: prefix + fallback
    let downlinesData = await redis.hgetall('bf:downlines:' + cleanPhone);
    if (!downlinesData || Object.keys(downlinesData).length === 0) {
      downlinesData = await redis.hgetall('downlines:' + cleanPhone) || {};
    }
    const downlines = downlinesData && typeof downlinesData === 'object' ? downlinesData : {};

    const rawListA = [];
    const rawListB = [];
    const rawListC = [];

    Object.entries(downlines).forEach(([p, level]) => {
      const l = String(level);
      if (l === '1') rawListA.push(p);
      if (l === '2') rawListB.push(p);
      if (l === '3') rawListC.push(p);
    });

    // 2. VIP LEVELS - fetch bf:user: + fallback user:
    const allMembers = [...rawListA, ...rawListB, ...rawListC];
    const vipMap = {};

    if (allMembers.length > 0) {
      const pipeline = redis.pipeline();
      allMembers.forEach((memberPhone) => {
        pipeline.hget('bf:user:' + memberPhone, 'vip');
      });
      const results = await pipeline.exec();
      // Upstash pipeline returns [val, val...] or [[val],[val]]
      allMembers.forEach((memberPhone, idx) => {
        let raw = results[idx];
        if (Array.isArray(raw)) raw = raw[0];
        if (!raw) {
          vipMap[memberPhone] = '0'; // digit only for new UI
        } else {
          let v = String(raw).toLowerCase().trim();
          const m = v.match(/[0-4]/);
          vipMap[memberPhone] = m ? m[0] : '0';
        }
      });
    }

    const formatTeamList = (arr) => arr.map((ph) => ({
      phone: ph,
      vip: vipMap[ph] || '0' // digit only
    }));

    const finalListA = formatTeamList(rawListA);
    const finalListB = formatTeamList(rawListB);
    const finalListC = formatTeamList(rawListC);

    // 3. FETCH FRESH TRANSACTIONS FROM ALL POSSIBLE KEYS - MERGE FOR FRESH DATA
    const keysToTry = [
      `bf:tx:${cleanPhone}:history`,
      `bf:transactions:${cleanPhone}`,
      `tx:${cleanPhone}:history`,
      `bf:tx:${cleanPhone}`,
    ];

    let allRaw = [];
    for (const key of keysToTry) {
      try {
        const chunk = await redis.lrange(key, 0, -1);
        if (chunk && chunk.length) allRaw = allRaw.concat(chunk);
      } catch {}
    }

    // dedupe by id
    const seen = new Set();
    const history = [];
    for (const item of allRaw) {
      if (!item) continue;
      let tx;
      try { tx = typeof item === 'string' ? JSON.parse(item) : item; } catch { continue; }
      if (!tx) continue;
      const id = tx.id || tx.txId || `${tx.type}-${tx.amount}-${tx.timestamp}`;
      if (seen.has(id)) continue;
      seen.add(id);
      history.push(tx);
    }

    // sort newest first
    history.sort((a, b) => toNum(b.timestamp || b.createdAt, 0) - toNum(a.timestamp || a.createdAt, 0));

    // 4. FRESH COMMISSION SUM - old + new as ONE big number
    const cumulativeCommission = history.reduce((sum, tx) => {
      const type = String(tx.type || tx.txType || '').toLowerCase();
      const label = String(tx.label || '').toLowerCase();
      const note = String(tx.note || '').toLowerCase();
      const combined = `${type} ${label} ${note}`;

      const isCommission = combined.includes('commission') || combined.includes('team') && (combined.includes('payout') || combined.includes('a_') || combined.includes('b_') || combined.includes('c_')) || combined.includes('referral') || combined.includes('invite') && combined.includes('bonus') || type === 'team_a_payout' || type === 'team_b_payout' || type === 'team_c_payout' || type === 'team_commission' || label === 'commission';

      // ignore withdrawals / deposits / bets
      const isNegativeType = combined.includes('withdraw') || combined.includes('deposit') || combined.includes('bet') || combined.includes('purchase');

      if (isCommission && !isNegativeType) {
        return sum + Math.abs(toNum(tx.amount, 0));
      }
      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      total: cumulativeCommission,
      teamCommissionTotal: cumulativeCommission, // used by front for UGX display
      transactions: history, // front filters fresh again too
      breakdown: {
        teamA: rawListA.length,
        teamB: rawListB.length,
        teamC: rawListC.length
      },
      listA: finalListA,
      listB: finalListB,
      listC: finalListC
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error) {
    console.error('Fatal API crash in GET /api/team:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}