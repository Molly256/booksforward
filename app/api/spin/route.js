import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const P = 'bf:';

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
    const userKey = `${P}user:${cleanPhone}`;
    const txKey = `${P}tx:${cleanPhone}:history`;

    const currentSpins = parseInt(await redis.hget(userKey, 'spins') || '0', 10);

    if (currentSpins < 1) {
      return NextResponse.json(
        { success: false, error: "You do not have any lucky spins remaining!" },
        { status: 400 }
      );
    }

    const prizeAmount = 2990;
    const timestamp = Date.now();
    const ugTime = new Date().toLocaleString("en-CA", { timeZone: "Africa/Kampala", hour12: false }).slice(0,16).replace(',',' ');

    // tx as magicalwheel
    const txData = {
      id: `tx_${timestamp}_magicalwheel`,
      type: 'magicalwheel',
      txType: 'magicalwheel',
      label: 'magicalwheel',
      note: 'Magical Wheel Win - 2990 UGX',
      amount: String(prizeAmount),
      timestamp: timestamp,
      createdAt: ugTime,
      status: 'success',
      currency: 'UGX',
      source: 'magicalwheel'
    };

    const pipeline = redis.pipeline();
    pipeline.hincrby(userKey, 'spins', -1);
    pipeline.hincrby(userKey, 'availableBalance', prizeAmount);
    pipeline.lpush(txKey, JSON.stringify(txData));
    await pipeline.exec();

    const remaining = await redis.hget(userKey, 'spins');
    const newBal = await redis.hget(userKey, 'availableBalance');

    return NextResponse.json({
      success: true,
      winningSliceIndex: 0,
      prizeAmount: prizeAmount,
      remainingSpins: Number(remaining || 0),
      newBalance: Number(newBal || 0)
    });

  } catch (error) {
    console.error("BF Wheel Spin Failure:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Processing Error." },
      { status: 500 }
    );
  }
}