import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Missing phone." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const userKey = `user:${cleanPhone}`;
    const txKey = `tx:${cleanPhone}:history`;

    const currentSpins = parseInt(await redis.hget(userKey, 'spins') || '0', 10);

    if (currentSpins < 1) {
      return NextResponse.json(
        { success: false, error: "You do not have any lucky spins remaining!" },
        { status: 400 }
      );
    }

    const prizeAmount = 2000;
    const timestamp = Date.now();

    // NEW BF STYLE TX - matches current app style
    const txData = {
      id: `bf_${timestamp}_wheel`,
      type: 'bf_system_increase',
      txType: 'bf_system_increase',
      label: 'bf_lucky_wheel_win',
      note: 'bf_lucky_wheel_win 2000 shs',
      amount: prizeAmount, // keep as number like commission does
      timestamp: timestamp,
      createdAt: timestamp,
      status: 'completed',
      currency: 'shs',
      source: 'bf_wheel'
    };

    const pipeline = redis.pipeline();
    pipeline.hincrby(userKey, 'spins', -1);
    pipeline.hincrby(userKey, 'availableBalance', prizeAmount);
    pipeline.lpush(txKey, JSON.stringify(txData));
    pipeline.hget(userKey, 'spins');
    pipeline.hget(userKey, 'availableBalance');

    const results = await pipeline.exec();

    return NextResponse.json({
      success: true,
      winningSliceIndex: 0,
      prizeAmount: prizeAmount,
      remainingSpins: Number(results[3] || 0),
      newBalance: Number(results[4] || 0)
    });

  } catch (error) {
    console.error("BF Wheel Spin Failure:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Processing Error." },
      { status: 500 }
    );
  }
}