import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@vbz/firebase-admin';

/**
 * Restore premium feature unlocks for a room
 * This is used when a user returns to a room after payment
 * to ensure their unlock is still valid
 */
export async function POST(req: NextRequest) {
  try {
    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing room ID' },
        { status: 400 }
      );
    }

    const db = getAdminDatabase();
    const now = Date.now();

    // Check if room already has unlocks
    const existingUnlocks = await db
      .ref(`games/spyfall/rooms/${roomId}/unlockedPremiumFeatures`)
      .get();

    if (existingUnlocks.exists()) {
      // Room already has unlocks, no need to restore
      return NextResponse.json({ 
        restored: false, 
        reason: 'Room already has unlocks' 
      });
    }

    // Look for any non-expired payments for this room
    const paymentsSnapshot = await db
      .ref('games/spyfall/payments')
      .orderByChild('roomId')
      .equalTo(roomId)
      .get();

    if (!paymentsSnapshot.exists()) {
      return NextResponse.json({ 
        restored: false, 
        reason: 'No payments found for this room' 
      });
    }

    const payments = paymentsSnapshot.val();
    const restoredFeatures: string[] = [];

    // Restore any non-expired payments
    for (const [sessionId, payment] of Object.entries(payments as Record<string, {
      feature: string;
      expiresAt: number;
      unlockedAt: number;
      unlockedBy: string;
      paymentSessionId: string;
      paymentAmount: number;
    }>)) {
      if (payment.expiresAt > now) {
        // Payment is still valid, restore the unlock
        await db
          .ref(`games/spyfall/rooms/${roomId}/unlockedPremiumFeatures/${payment.feature}`)
          .set({
            unlockedAt: payment.unlockedAt,
            unlockedBy: payment.unlockedBy,
            paymentSessionId: payment.paymentSessionId,
            paymentAmount: payment.paymentAmount,
          });
        
        restoredFeatures.push(payment.feature);
        console.log(`Restored premium feature ${payment.feature} for room ${roomId}`);
      }
    }

    return NextResponse.json({ 
      restored: restoredFeatures.length > 0,
      restoredFeatures 
    });
  } catch (error) {
    console.error('Restore unlocks error:', error);
    return NextResponse.json(
      { error: 'Failed to restore unlocks' },
      { status: 500 }
    );
  }
}
