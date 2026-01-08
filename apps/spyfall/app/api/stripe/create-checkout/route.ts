import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDatabase } from '@vbz/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { priceId, roomId, playerId, feature } = await req.json();

    if (!priceId || !roomId || !playerId || !feature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if feature is already unlocked to prevent duplicate purchases
    const db = getAdminDatabase();
    const existingUnlock = await db
      .ref(`games/spyfall/rooms/${roomId}/unlockedPremiumFeatures/${feature}`)
      .get();

    if (existingUnlock.exists()) {
      return NextResponse.json(
        { error: 'Feature is already unlocked for this room' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/room/${roomId}?payment=success&feature=${feature}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/room/${roomId}?payment=cancelled`,
      metadata: {
        roomId,
        playerId,
        feature,
        type: 'spyfall_premium_feature',
      },
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
