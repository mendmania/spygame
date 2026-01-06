import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDatabase } from '@vbz/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Verify a Stripe payment and unlock the premium role
 * This is used as a fallback when webhooks don't reach localhost
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    // Verify this is a premium role unlock
    if (session.metadata?.type !== 'premium_role_unlock') {
      return NextResponse.json(
        { error: 'Invalid session type' },
        { status: 400 }
      );
    }

    const { roomId, playerId, role } = session.metadata;

    if (!roomId || !playerId || !role) {
      return NextResponse.json(
        { error: 'Missing metadata in session' },
        { status: 400 }
      );
    }

    const db = getAdminDatabase();
    
    // Check if already unlocked
    const existingUnlock = await db
      .ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles/${role}`)
      .get();

    if (existingUnlock.exists()) {
      return NextResponse.json({ 
        success: true, 
        alreadyUnlocked: true,
        role 
      });
    }

    // Store the unlock for this room session
    await db.ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles/${role}`).set({
      unlockedAt: Date.now(),
      unlockedBy: playerId,
      paymentSessionId: session.id,
      paymentAmount: session.amount_total,
    });

    console.log(`Premium role ${role} unlocked for room ${roomId} by player ${playerId} (via verify-payment)`);

    return NextResponse.json({ 
      success: true, 
      role,
      roomId 
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
