'use server';

/**
 * Admin Index Update Actions for Werewolf
 * 
 * These server actions update the /adminIndex path whenever
 * room state changes. They are called alongside game actions.
 */

import { getAdminDatabase } from '@/lib/firebase-admin';

type RoomStatus = 'waiting' | 'reveal' | 'night' | 'day' | 'voting' | 'finished' | 'closed';

interface RoomIndexData {
  status: RoomStatus;
  playerCount: number;
  createdAt: number;
  lastActiveAt: number;
  hostName: string;
  hostId: string;
}

const ADMIN_INDEX_BASE = 'adminIndex';

/**
 * Update room entry in admin index
 */
export async function updateAdminRoomIndex(
  roomId: string,
  data: Partial<RoomIndexData>
): Promise<void> {
  try {
    const db = getAdminDatabase();
    const indexRef = db.ref(`${ADMIN_INDEX_BASE}/rooms/werewolf/${roomId}`);
    
    const snapshot = await indexRef.once('value');
    
    if (snapshot.exists()) {
      // Update existing entry
      await indexRef.update({
        ...data,
        lastActiveAt: Date.now(),
      });
    } else {
      // Create new entry
      await indexRef.set({
        status: 'waiting',
        playerCount: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        hostName: '',
        hostId: '',
        ...data,
      });

      // Increment rooms created today counter
      await incrementRoomsCreatedToday();
      await incrementActiveRooms();
    }
  } catch (error) {
    // Log but don't throw - admin index updates should not break game flow
    console.error('Failed to update admin room index:', error);
  }
}

/**
 * Update room status in admin index
 */
export async function updateAdminRoomStatus(
  roomId: string,
  status: RoomStatus
): Promise<void> {
  try {
    const db = getAdminDatabase();
    const indexRef = db.ref(`${ADMIN_INDEX_BASE}/rooms/werewolf/${roomId}`);
    
    const snapshot = await indexRef.once('value');
    if (!snapshot.exists()) return;

    const currentData = snapshot.val();
    const wasActive = isActiveStatus(currentData.status);
    const isActive = isActiveStatus(status);

    await indexRef.update({
      status,
      lastActiveAt: Date.now(),
    });

    // Update active rooms counter
    if (wasActive && !isActive) {
      await decrementActiveRooms();
      await decrementActivePlayers(currentData.playerCount || 0);
    }
  } catch (error) {
    console.error('Failed to update admin room status:', error);
  }
}

/**
 * Check if a status is considered "active" (game in progress)
 */
function isActiveStatus(status: RoomStatus): boolean {
  return status === 'waiting' || status === 'reveal' || status === 'night' || 
         status === 'day' || status === 'voting';
}

/**
 * Update player count in admin index
 */
export async function updateAdminPlayerCount(
  roomId: string,
  playerCount: number,
  hostName?: string,
  hostId?: string
): Promise<void> {
  try {
    const db = getAdminDatabase();
    const indexRef = db.ref(`${ADMIN_INDEX_BASE}/rooms/werewolf/${roomId}`);
    
    const snapshot = await indexRef.once('value');
    if (!snapshot.exists()) return;

    const currentData = snapshot.val();
    const oldCount = currentData.playerCount || 0;
    const isActive = isActiveStatus(currentData.status);

    const updateData: Record<string, unknown> = {
      playerCount,
      lastActiveAt: Date.now(),
    };

    if (hostName !== undefined) updateData.hostName = hostName;
    if (hostId !== undefined) updateData.hostId = hostId;

    await indexRef.update(updateData);

    // Update active players counter
    if (isActive) {
      const diff = playerCount - oldCount;
      if (diff > 0) {
        await incrementActivePlayers(diff);
      } else if (diff < 0) {
        await decrementActivePlayers(Math.abs(diff));
      }
    }
  } catch (error) {
    console.error('Failed to update admin player count:', error);
  }
}

/**
 * Remove room from admin index
 */
export async function removeFromAdminIndex(roomId: string): Promise<void> {
  try {
    const db = getAdminDatabase();
    const indexRef = db.ref(`${ADMIN_INDEX_BASE}/rooms/werewolf/${roomId}`);
    
    const snapshot = await indexRef.once('value');
    if (!snapshot.exists()) return;

    const currentData = snapshot.val();
    const wasActive = isActiveStatus(currentData.status);

    await indexRef.remove();

    if (wasActive) {
      await decrementActiveRooms();
      await decrementActivePlayers(currentData.playerCount || 0);
    }
  } catch (error) {
    console.error('Failed to remove from admin index:', error);
  }
}

// Analytics counter helpers
async function incrementActiveRooms(): Promise<void> {
  const db = getAdminDatabase();
  const ref = db.ref(`${ADMIN_INDEX_BASE}/analytics/activeRooms`);
  const snapshot = await ref.once('value');
  await ref.set((snapshot.val() || 0) + 1);
}

async function decrementActiveRooms(): Promise<void> {
  const db = getAdminDatabase();
  const ref = db.ref(`${ADMIN_INDEX_BASE}/analytics/activeRooms`);
  const snapshot = await ref.once('value');
  await ref.set(Math.max(0, (snapshot.val() || 0) - 1));
}

async function incrementActivePlayers(count: number): Promise<void> {
  if (count <= 0) return;
  const db = getAdminDatabase();
  const ref = db.ref(`${ADMIN_INDEX_BASE}/analytics/activePlayers`);
  const snapshot = await ref.once('value');
  await ref.set((snapshot.val() || 0) + count);
}

async function decrementActivePlayers(count: number): Promise<void> {
  if (count <= 0) return;
  const db = getAdminDatabase();
  const ref = db.ref(`${ADMIN_INDEX_BASE}/analytics/activePlayers`);
  const snapshot = await ref.once('value');
  await ref.set(Math.max(0, (snapshot.val() || 0) - count));
}

async function incrementRoomsCreatedToday(): Promise<void> {
  const db = getAdminDatabase();
  const analyticsRef = db.ref(`${ADMIN_INDEX_BASE}/analytics`);
  
  const snapshot = await analyticsRef.once('value');
  const data = snapshot.val() || {};
  const today = new Date().toISOString().split('T')[0];
  
  if (data.lastResetDate !== today) {
    // Reset daily counter
    await analyticsRef.update({
      roomsCreatedToday: 1,
      lastResetDate: today,
    });
  } else {
    const countRef = db.ref(`${ADMIN_INDEX_BASE}/analytics/roomsCreatedToday`);
    const countSnapshot = await countRef.once('value');
    await countRef.set((countSnapshot.val() || 0) + 1);
  }
}
