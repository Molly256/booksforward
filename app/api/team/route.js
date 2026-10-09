export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const toNum = function(v, f) {
  if (f === undefined) f = 0;
  if (v === undefined || v === null) return f;
  const n = Number(v);
  return Number.isNaN(n)? f : n;
};

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    if (!phone ||!/^07\d{8}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Valid phone parameter is required' }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();

    // 1. Fetch downlines - FIXED KEY with bf: prefix + fallback for old data
    let downlinesData = await redis.hgetall('bf:downlines:' + cleanPhone);
    if (!downlinesData || Object.keys(downlinesData).length === 0) {
      // fallback to old key without bf: if you have old data
      downlinesData = await redis.hgetall('downlines:' + cleanPhone) || {};
    }
    const downlines = downlinesData && typeof downlinesData === 'object'? downlinesData : {};

    const rawListA = [];
    const rawListB = [];
    const rawListC = [];

    Object.entries(downlines).forEach(function([p, level]) {
      const stringLevel = String(level);
      if (stringLevel === '1') rawListA.push(p);
      if (stringLevel === '2') rawListB.push(p);
      if (stringLevel === '3') rawListC.push(p);
    });

    // FIXED: don't zero out B/C if A is empty
    const cleanListA = rawListA;
    const cleanListB = rawListB;
    const cleanListC = rawListC;

    // 2. FETCH VIP LEVELS - FIXED KEY bf:user:
    const allMembers = [...cleanListA,...cleanListB,...cleanListC];
    const vipMap = {};

    if (allMembers.length > 0) {
      const pipeline = redis.pipeline();
      allMembers.forEach(function(memberPhone) {
        pipeline.hget('bf:user:' + memberPhone, 'vip');
      });
      const pipelineResults = await pipeline.exec();
      allMembers.forEach(function(memberPhone, index) {
        let vipValue = pipelineResults[index];
        if (!vipValue) {
          // fallback old key
          vipMap[memberPhone] = 'vip0';
        } else {
          let v = String(vipValue).toLowerCase().trim();
          if (v === '0' || v === '') v = 'vip0';
          if (v === '1') v = 'vip1';
          if (v === '2') v = 'vip2';
          if (v === '3') v = 'vip3';
          if (v === '4') v = 'vip4';
          if (!['vip0','vip1','vip2','vip3','vip4'].includes(v)) {
            // if stored as 0,1,2 convert
            if (['0','1','2','3','4'].includes(v)) v = 'vip' + v;
            else v = 'vip0';
          }
          vipMap[memberPhone] = v;
        }
      });
    }

    const formatTeamList = function(phoneArray) {
      return phoneArray.map(function(memberPhone) {
        return {
          phone: memberPhone,
          vip: vipMap[memberPhone] || 'vip0'
        };
      });
    };

    const finalResultListA = formatTeamList(cleanListA);
    const finalResultListB = formatTeamList(cleanListB);
    const finalResultListC = formatTeamList(cleanListC);

    // 3. Read tx history - FIXED try both keys
    let rawHistory = await redis.lrange('bf:transactions:' + cleanPhone, 0, -1) || [];
    if (rawHistory.length === 0) {
      rawHistory = await redis.lrange(`tx:${cleanPhone}:history`, 0, -1) || [];
    }
    // also try bf:tx:phone:history
    if (rawHistory.length === 0) {
      rawHistory = await redis.lrange(`bf:tx:${cleanPhone}:history`, 0, -1) || [];
    }

    const history = rawHistory.map(function(item) {
      if (!item) return null;
      try {
        return typeof item === 'string'? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // 4. BF PREFIX ACCUMULATOR - only bf commissions
    const cumulativeCommission = history.reduce(function(sum, tx) {
      const txLabel = String(tx.label || '').toLowerCase().trim();
      const txType = String(tx.type || tx.txType || '').toLowerCase().trim();
      const txNote = String(tx.note || '').toLowerCase().trim();

      const isBF = txType.startsWith('bf') || txLabel.startsWith('bf') || txType.includes('bf_') || txLabel.includes('bf_') || txType.includes('bfcommission') || txLabel.includes('bfcommission');

      const isCommission =
        txLabel === 'commission' ||
        txLabel.includes('commission') ||
        txType === 'commission' ||
        txType === 'team_commission' ||
        txType === 'team_a_payout' ||
        txType === 'team_b_payout' ||
        txType === 'team_c_payout' ||
        txType.includes('commission') ||
        txNote.includes('commission');

      if (isBF && isCommission) {
        return sum + Math.abs(toNum(tx.amount, 0));
      }

      if (txType.startsWith('bf') && (txType.includes('commission') || txType.includes('team'))) {
        return sum + Math.abs(toNum(tx.amount, 0));
      }

      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      total: cumulativeCommission,
      teamCommissionTotal: cumulativeCommission,
      transactions: history,
      breakdown: {
        teamA: cleanListA.length,
        teamB: cleanListB.length,
        teamC: cleanListC.length
      },
      listA: finalResultListA,
      listB: finalResultListB,
      listC: finalResultListC
    }, { status: 200 });

  } catch (error) {
    console.error('Fatal API crash in GET /api/team:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}