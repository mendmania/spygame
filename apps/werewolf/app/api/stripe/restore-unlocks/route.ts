import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@vbz/firebase-admin';

interface PaymentRecord {
  unlockedAt: number;
  unlockedBy: string;
  paymentSessionId: string;
  paymentAmount: number;
  roomId: string;
  role: string;
  expiresAt: number;
}

/**
 * Restore premium role unlocks for a room
 * 
 * This is called when a user joins a room to check if there are any
 * valid payment records that should restore unlocks for this room.
 * 
 * This handles the case where:
 * 1. User buys Witch for room ABC
 * 2. All players leave (room gets deleted)
 * 3. User returns to room ABC within 24 hours
 * 4. The Witch unlock is restored from the payment record
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
      .ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles`)
      .get();

    if (existingUnlocks.exists()) {
      // Room already has unlocks, no need to restore
      return NextResponse.json({ 
        success: true, 
        restored: false,
        message: 'Room already has unlocks' 
      });
    }

    // Find all payment records for this room that haven't expired
    const paymentsSnapshot = await db
      .ref('games/werewolf/payments')
      .orderByChild('roomId')
      .equalTo(roomId)
      .get();

    if (!paymentsSnapshot.exists()) {
      return NextResponse.json({ 
        success: true, 
        restored: false,
        message: 'No payment records found for this room' 
      });
    }

    const payments = paymentsSnapshot.val() as Record<string, PaymentRecord>;
    const restoredRoles: string[] = [];

    // Restore each valid payment
    for (const [sessionId, payment] of Object.entries(payments)) {
      // Skip expired payments
      if (payment.expiresAt < now) {
        // Clean up expired payment record
        await db.ref(`games/werewolf/payments/${sessionId}`).remove();
        continue;
      }

      // Restore the unlock
      await db.ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles/${payment.role}`).set({
        unlockedAt: payment.unlockedAt,
        unlockedBy: payment.unlockedBy,
        paymentSessionId: payment.paymentSessionId,
        paymentAmount: payment.paymentAmount,
        restoredAt: now,
      });

      restoredRoles.push(payment.role);
      console.log(`Restored ${payment.role} unlock for room ${roomId} from payment ${sessionId}`);
    }

    return NextResponse.json({ 
      success: true, 
      restored: restoredRoles.length > 0,
      restoredRoles,
    });
  } catch (error) {
    console.error('Restore unlocks error:', error);
    return NextResponse.json(
      { error: 'Failed to restore unlocks' },
      { status: 500 }
    );
  }
}
