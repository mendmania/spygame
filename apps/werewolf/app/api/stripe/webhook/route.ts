import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDatabase } from '@vbz/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Only process our premium role unlock payments
    if (session.metadata?.type !== 'premium_role_unlock') {
      return NextResponse.json({ received: true });
    }

    const { roomId, playerId, role } = session.metadata;

    if (!roomId || !playerId || !role) {
      console.error('Missing metadata in session:', session.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    try {
      const db = getAdminDatabase();
      
      // Store the unlock for this room session
      // This unlocks the role for everyone in this room for this game
      await db.ref(`games/werewolf/rooms/${roomId}/unlockedPremiumRoles/${role}`).set({
        unlockedAt: Date.now(),
        unlockedBy: playerId,
        paymentSessionId: session.id,
        paymentAmount: session.amount_total,
      });

      console.log(`Premium role ${role} unlocked for room ${roomId} by player ${playerId}`);
    } catch (error) {
      console.error('Failed to store premium role unlock:', error);
      return NextResponse.json(
        { error: 'Failed to process unlock' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
