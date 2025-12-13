'use server';

import { getAdminDbRef, verifyAdminUser } from '@/lib/firebase-admin';
import type {
  AdminActionResult,
  AdminAnalytics,
  AdminRoomSummary,
  AdminDashboardData,
  GameType,
} from '@/types';

// Verify admin and return result or throw
async function requireAdmin(idToken: string): Promise<{ uid: string; email: string | null }> {
  const result = await verifyAdminUser(idToken);
  if (!result.isAdmin) {
    throw new Error(result.error || 'Unauthorized: Admin access required');
  }
  return { uid: result.uid!, email: result.email };
}

// Get dashboard data (analytics + room list)
export async function getDashboardData(idToken: string): Promise<AdminDashboardData> {
  await requireAdmin(idToken);

  const db = getAdminDbRef('adminIndex');

  // Get analytics
  const analyticsSnapshot = await db.child('analytics').once('value');
  const analytics: AdminAnalytics = analyticsSnapshot.val() || {
    activeRooms: 0,
    activePlayers: 0,
    roomsCreatedToday: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
  };

  // Check if we need to reset daily counter
  const today = new Date().toISOString().split('T')[0];
  if (analytics.lastResetDate !== today) {
    analytics.roomsCreatedToday = 0;
    analytics.lastResetDate = today;
  }

  // Get all rooms from all games
  const roomsSnapshot = await db.child('rooms').once('value');
  const roomsData = roomsSnapshot.val() || {};

  const rooms: AdminDashboardData['rooms'] = [];

  for (const game of Object.keys(roomsData) as GameType[]) {
    const gameRooms = roomsData[game] || {};
    for (const roomId of Object.keys(gameRooms)) {
      rooms.push({
        game,
        roomId,
        summary: gameRooms[roomId] as AdminRoomSummary,
      });
    }
  }

  // Sort by lastActiveAt descending
  rooms.sort((a, b) => b.summary.lastActiveAt - a.summary.lastActiveAt);

  return { analytics, rooms };
}

// Get rooms filtered by game
export async function getRoomsByGame(
  idToken: string,
  game: GameType
): Promise<{ roomId: string; summary: AdminRoomSummary }[]> {
  await requireAdmin(idToken);

  const roomsRef = getAdminDbRef(`adminIndex/rooms/${game}`);
  const snapshot = await roomsRef.once('value');
  const roomsData = snapshot.val() || {};

  const rooms = Object.entries(roomsData).map(([roomId, summary]) => ({
    roomId,
    summary: summary as AdminRoomSummary,
  }));

  // Sort by lastActiveAt descending
  rooms.sort((a, b) => b.summary.lastActiveAt - a.summary.lastActiveAt);

  return rooms;
}

// Close a room (force end + mark as closed)
export async function closeRoom(
  idToken: string,
  game: GameType,
  roomId: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin(idToken);

    // Update room status in adminIndex
    const indexRef = getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');

    if (!indexSnapshot.exists()) {
      return { success: false, message: 'Room not found in index' };
    }

    const currentSummary = indexSnapshot.val() as AdminRoomSummary;

    // Update the actual game room state
    const gameRoomRef = getAdminDbRef(`games/${game}/rooms/${roomId}`);
    const gameRoomSnapshot = await gameRoomRef.once('value');

    if (gameRoomSnapshot.exists()) {
      // Update the game room state to finished/closed
      await gameRoomRef.child('state').update({
        status: 'finished',
        closedByAdmin: true,
        closedAt: Date.now(),
        closedBy: admin.uid,
      });
    }

    // Update index
    await indexRef.update({
      status: 'closed',
      lastActiveAt: Date.now(),
    });

    // Decrement active counters if room was active
    if (currentSummary.status === 'waiting' || currentSummary.status === 'playing') {
      const analyticsRef = getAdminDbRef('adminIndex/analytics');
      const analyticsSnapshot = await analyticsRef.once('value');
      const analytics = analyticsSnapshot.val() || {};

      await analyticsRef.update({
        activeRooms: Math.max(0, (analytics.activeRooms || 0) - 1),
        activePlayers: Math.max(0, (analytics.activePlayers || 0) - currentSummary.playerCount),
      });
    }

    return { success: true, message: `Room ${roomId} closed successfully` };
  } catch (error) {
    console.error('Error closing room:', error);
    return {
      success: false,
      message: 'Failed to close room',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// End game for a room (mark as finished but don't close)
export async function endGameForRoom(
  idToken: string,
  game: GameType,
  roomId: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin(idToken);

    // Update room status in adminIndex
    const indexRef = getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');

    if (!indexSnapshot.exists()) {
      return { success: false, message: 'Room not found in index' };
    }

    const currentSummary = indexSnapshot.val() as AdminRoomSummary;

    if (currentSummary.status !== 'playing') {
      return { success: false, message: 'Room is not currently playing' };
    }

    // Update the actual game room state
    const gameRoomRef = getAdminDbRef(`games/${game}/rooms/${roomId}`);
    const gameRoomSnapshot = await gameRoomRef.once('value');

    if (gameRoomSnapshot.exists()) {
      await gameRoomRef.child('state').update({
        status: 'finished',
        endedByAdmin: true,
        endedAt: Date.now(),
        endedBy: admin.uid,
      });
    }

    // Update index
    await indexRef.update({
      status: 'finished',
      lastActiveAt: Date.now(),
    });

    return { success: true, message: `Game ended for room ${roomId}` };
  } catch (error) {
    console.error('Error ending game:', error);
    return {
      success: false,
      message: 'Failed to end game',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Delete a room entirely (use with caution)
export async function deleteRoom(
  idToken: string,
  game: GameType,
  roomId: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin(idToken);

    // Get current room info for analytics update
    const indexRef = getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');

    if (!indexSnapshot.exists()) {
      return { success: false, message: 'Room not found in index' };
    }

    const currentSummary = indexSnapshot.val() as AdminRoomSummary;

    // Delete the actual game room
    const gameRoomRef = getAdminDbRef(`games/${game}/rooms/${roomId}`);
    await gameRoomRef.remove();

    // Delete from index
    await indexRef.remove();

    // Update analytics if room was active
    if (currentSummary.status === 'waiting' || currentSummary.status === 'playing') {
      const analyticsRef = getAdminDbRef('adminIndex/analytics');
      const analyticsSnapshot = await analyticsRef.once('value');
      const analytics = analyticsSnapshot.val() || {};

      await analyticsRef.update({
        activeRooms: Math.max(0, (analytics.activeRooms || 0) - 1),
        activePlayers: Math.max(0, (analytics.activePlayers || 0) - currentSummary.playerCount),
      });
    }

    console.log(`Room ${game}/${roomId} deleted by admin ${admin.uid}`);

    return { success: true, message: `Room ${roomId} deleted successfully` };
  } catch (error) {
    console.error('Error deleting room:', error);
    return {
      success: false,
      message: 'Failed to delete room',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Add a user to admin allowlist (super admin only - requires direct DB access)
export async function addAdminUser(
  idToken: string,
  targetUid: string
): Promise<AdminActionResult> {
  try {
    await requireAdmin(idToken);

    const adminRef = getAdminDbRef(`adminUsers/${targetUid}`);
    await adminRef.set(true);

    return { success: true, message: `User ${targetUid} added as admin` };
  } catch (error) {
    console.error('Error adding admin user:', error);
    return {
      success: false,
      message: 'Failed to add admin user',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Remove a user from admin allowlist
export async function removeAdminUser(
  idToken: string,
  targetUid: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin(idToken);

    // Prevent removing yourself
    if (admin.uid === targetUid) {
      return { success: false, message: 'Cannot remove yourself from admin' };
    }

    const adminRef = getAdminDbRef(`adminUsers/${targetUid}`);
    await adminRef.remove();

    return { success: true, message: `User ${targetUid} removed from admin` };
  } catch (error) {
    console.error('Error removing admin user:', error);
    return {
      success: false,
      message: 'Failed to remove admin user',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
