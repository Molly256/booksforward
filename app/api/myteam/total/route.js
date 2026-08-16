export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const toNum = function(v, f) {
  if (f === undefined) f = 0;
  if (v === undefined || v === null) return f;
  const n = Number(v);
  return Number.isNaN(n) ? f : n;
};

/**
 * GET: Pulls live downlines with VIP levels and adds up all commission entries
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone'); 

    if (!phone || !/^07\d{8}$/.test(phone)) { 
      return NextResponse.json({ success: false, error: 'Valid phone parameter is required' }, { status: 400 }); 
    }

    const cleanPhone = String(phone).trim();

    // 1. Fetch downlines hierarchy tree from Redis
    const downlinesData = await redis.hgetall('downlines:' + cleanPhone);
    const downlines = downlinesData && typeof downlinesData === 'object' ? downlinesData : {};
    
    const rawListA = [];
    const rawListB = [];
    const rawListC = [];

    Object.entries(downlines).forEach(function([p, level]) {
      const stringLevel = String(level);
      if (stringLevel === '1') rawListA.push(p); 
      if (stringLevel === '2') rawListB.push(p); 
      if (stringLevel === '3') rawListC.push(p); 
    });

    const cleanListA = rawListA;
    const cleanListB = cleanListA.length === 0 ? [] : rawListB;
    const cleanListC = (cleanListA.length === 0 || cleanListB.length === 0) ? [] : rawListC;

    // --- NEW: FETCH VIP LEVELS FOR ALL TEAM MEMBERS IN BULK ---
    // Gather all unique phone numbers from your active teams
    const allMembers = [...cleanListA, ...cleanListB, ...cleanListC];
    const vipMap = {};

    if (allMembers.length > 0) {
      // Use an Upstash Redis pipeline to fetch all VIP data in a single round-trip
      const pipeline = redis.pipeline();
      allMembers.forEach(function(memberPhone) {
        // Looks up the master profile data hash where user data is kept
        pipeline.hget('user:' + memberPhone, 'vip');
      });
      
      const pipelineResults = await pipeline.exec();
      
      // Map the array results back to their matching phone numbers
      allMembers.forEach(function(memberPhone, index) {
        const vipValue = pipelineResults[index];
        vipMap[memberPhone] = vipValue ? String(vipValue).toLowerCase().trim() : '';
      });
    }

    // Convert flat phone arrays into structured objects containing both phone numbers and VIP level labels
    const formatTeamList = function(phoneArray) {
      return phoneArray.map(function(memberPhone) {
        return {
          phone: memberPhone,
          vip: vipMap[memberPhone] || '' // returns 'vip1', 'vip2', 'vip3', etc.
        };
      });
    };

    const finalResultListA = formatTeamList(cleanListA);
    const finalResultListB = formatTeamList(cleanListB);
    const finalResultListC = formatTeamList(cleanListC);
    // ----------------------------------------------------------

    // 2. Read user transactions exclusively from the master history key path
    const historyKey = `tx:${cleanPhone}:history`;
    const rawHistory = await redis.lrange(historyKey, 0, -1) || [];
    
    // Parse raw strings into clean objects safely
    const history = rawHistory.map(function(item) {
      if (!item) return null;
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // 3. REAL-TIME ACCUMULATOR ENGINE: Targets transactions explicitly labeled as "commission"
    const cumulativeCommission = history.reduce(function(sum, tx) {
      const txLabel = String(tx.label || '').toLowerCase().trim();
      const txType = String(tx.type || '').toLowerCase().trim();
      const txNote = String(tx.note || '').toLowerCase().trim();
      
      if (
        txLabel === 'commission' ||
        txLabel.includes('commission') ||
        txType === 'commission' || 
        txType === 'team_commission' ||
        txType === 'team_a_payout' ||
        txType === 'team_b_payout' ||
        txType === 'team_c_payout' ||
        txNote.includes('commission')
      ) {
        return sum + Math.abs(toNum(tx.amount, 0));
      }
      return sum;
    }, 0);

    // 4. Return the live data payload to your frontend layout elements
    return NextResponse.json({
      success: true,
      total: cumulativeCommission, 
      teamCommissionTotal: cumulativeCommission,        
      breakdown: {
        teamA: cleanListA.length, 
        teamB: cleanListB.length, 
        teamC: cleanListC.length
      },
      listA: finalResultListA, // Now returns arrays of objects containing VIP levels
      listB: finalResultListB, 
      listC: finalResultListC  
    }, { status: 200 });

  } catch (error) {
    console.error('Fatal API endpoint crash in GET /api/myteam/total:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
