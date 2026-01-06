import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@vbz/firebase-admin';

/**
 * DEV ONLY: Manually unlock a premium role for a room
 * This is for testing purposes when Stripe webhooks aren't configured
 * 
 * Usage: POST /api/stripe/dev-unlock with { roomId, role }
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { roomId, role } = await req.json();

    if (!roomId || !role) {
      return NextResponse.json(
        { error: 'Missing roomId or role' },
        { status: 400 }
      );
    }

    const db = getAdminDatabase();
    
    await db.ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles/${role}`).set({
      unlockedAt: Date.now(),
      unlockedBy: 'dev-unlock',
      paymentSessionId: 'dev-manual-unlock',
      paymentAmount: 0,
    });

    console.log(`[DEV] Premium role ${role} manually unlocked for room ${roomId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Role ${role} unlocked for room ${roomId}` 
    });
  } catch (error) {
    console.error('Dev unlock error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock role' },
      { status: 500 }
    );
  }
}
