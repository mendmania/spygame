'use server';

import { getAdminDbRef, verifyAdminUser } from '@/lib/firebase-admin';
import type {
  AdminActionResult,
  AdminAnalytics,
  AdminRoomSummary,
  AdminDashboardData,
  AdminRoomDetail,
  AdminPlayerInfo,
  GameType,
  GameStats,
  DailyStats,
  WeeklyStats,
  ExtendedAnalytics,
  ChartDataPoint,
} from '@/types';

// Verify admin and return result or throw
async function requireAdmin(idToken: string): Promise<{ uid: string; email: string | null }> {
  const result = await verifyAdminUser(idToken);
  if (!result.isAdmin) {
    throw new Error(result.error || 'Unauthorized: Admin access required');
  }
  return { uid: result.uid!, email: result.email };
}

// Helper to create empty GameStats
function emptyGameStats(): GameStats {
  return { spyfall: 0, werewolf: 0, codenames: 0, total: 0 };
}

// Helper to get date string in YYYY-MM-DD format
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get Monday of a week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get week identifier (YYYY-Www)
function getWeekId(date: Date): string {
  const monday = getMondayOfWeek(date);
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const days = Math.floor((monday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${monday.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Helper to check if status is active
function isActiveStatus(status: string): boolean {
  return ['waiting', 'playing', 'night', 'day', 'voting'].includes(status);
}

// Get dashboard data (analytics + room list)
export async function getDashboardData(idToken: string): Promise<AdminDashboardData> {
  await requireAdmin(idToken);

  const db = await getAdminDbRef('adminIndex');

  // Get current date info for time-based stats
  const now = new Date();
  const today = getDateString(now);
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const monday = getMondayOfWeek(now);
  const weekStart = getDateString(monday);

  // Calculate time boundaries
  const todayStart = new Date(today).getTime();
  const weekStartTime = monday.getTime();
  const monthStartTime = new Date(currentMonth + '-01').getTime();

  // Get stored daily stats for the last 7 days
  const last7DaysData: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getDateString(d);
    last7DaysData.push({
      date: dateStr,
      gamesCreated: emptyGameStats(),
      peakActiveRooms: 0,
      peakActivePlayers: 0,
      totalPlayersJoined: 0,
    });
  }

  const rooms: AdminDashboardData['rooms'] = [];

  // Tracking variables for accurate counting
  let activeRooms = 0;
  let activePlayers = 0;
  const todayByGame = emptyGameStats();
  const weekByGame = emptyGameStats();
  const monthByGame = emptyGameStats();

  // Process Spyfall rooms - FIX: Use meta.status not state.status
  const spyfallRoomsRef = await getAdminDbRef('games/spyfall/rooms');
  const spyfallRoomsSnapshot = await spyfallRoomsRef.once('value');
  const spyfallRoomsData = spyfallRoomsSnapshot.val() || {};

  for (const roomId of Object.keys(spyfallRoomsData)) {
    const room = spyfallRoomsData[roomId];
    if (!room) continue;

    const players = room.players || {};
    const playerCount = Object.keys(players).length;
    
    // FIX: Spyfall uses meta.status, not state.status
    const status = room.meta?.status || 'waiting';
    const isActive = isActiveStatus(status);
    const createdAt = room.meta?.createdAt || Date.now();

    if (isActive) {
      activeRooms++;
      activePlayers += playerCount;
    }

    // Count rooms by time period with per-game breakdown
    if (createdAt >= todayStart) {
      todayByGame.spyfall++;
      todayByGame.total++;
    }
    if (createdAt >= weekStartTime) {
      weekByGame.spyfall++;
      weekByGame.total++;
    }
    if (createdAt >= monthStartTime) {
      monthByGame.spyfall++;
      monthByGame.total++;
    }

    // Update daily stats for charts
    const roomDate = getDateString(new Date(createdAt));
    const dayStats = last7DaysData.find(d => d.date === roomDate);
    if (dayStats) {
      dayStats.gamesCreated.spyfall++;
      dayStats.gamesCreated.total++;
    }

    // Get host info
    const hostId = room.meta?.createdBy || Object.keys(players)[0] || '';
    const hostPlayer = players[hostId];
    const hostName = hostPlayer?.displayName || 'Unknown';

    rooms.push({
      game: 'spyfall',
      roomId,
      summary: {
        status: status as AdminRoomSummary['status'],
        playerCount,
        createdAt,
        lastActiveAt: room.meta?.lastActiveAt || createdAt,
        hostName,
        hostId,
      },
    });
  }

  // Process Werewolf rooms - FIX: Properly handle werewolf status
  const werewolfRoomsRef = await getAdminDbRef('games/werewolf/rooms');
  const werewolfRoomsSnapshot = await werewolfRoomsRef.once('value');
  const werewolfRoomsData = werewolfRoomsSnapshot.val() || {};

  for (const roomId of Object.keys(werewolfRoomsData)) {
    const room = werewolfRoomsData[roomId];
    if (!room) continue;

    const players = room.players || {};
    const playerCount = Object.keys(players).length;
    // Werewolf uses meta.status with different values: waiting, night, day, voting, ended
    const status = room.meta?.status || 'waiting';
    const isActive = isActiveStatus(status);
    const createdAt = room.meta?.createdAt || Date.now();

    if (isActive) {
      activeRooms++;
      activePlayers += playerCount;
    }

    // Count rooms by time period with per-game breakdown
    if (createdAt >= todayStart) {
      todayByGame.werewolf++;
      todayByGame.total++;
    }
    if (createdAt >= weekStartTime) {
      weekByGame.werewolf++;
      weekByGame.total++;
    }
    if (createdAt >= monthStartTime) {
      monthByGame.werewolf++;
      monthByGame.total++;
    }

    // Update daily stats for charts
    const roomDate = getDateString(new Date(createdAt));
    const dayStats = last7DaysData.find(d => d.date === roomDate);
    if (dayStats) {
      dayStats.gamesCreated.werewolf++;
      dayStats.gamesCreated.total++;
    }

    // Get host info - find player with isHost: true
    let hostId = '';
    let hostName = 'Unknown';
    for (const [pid, player] of Object.entries(players) as [string, Record<string, unknown>][]) {
      if (player?.isHost) {
        hostId = pid;
        hostName = (player.name as string) || (player.displayName as string) || 'Unknown';
        break;
      }
    }

    rooms.push({
      game: 'werewolf',
      roomId,
      summary: {
        status: status as AdminRoomSummary['status'],
        playerCount,
        createdAt,
        lastActiveAt: room.meta?.lastActiveAt || createdAt,
        hostName,
        hostId,
      },
    });
  }

  // Build analytics object with accurate counts
  const analytics: AdminAnalytics = {
    activeRooms,
    activePlayers,
    roomsCreatedToday: todayByGame.total,
    roomsCreatedThisWeek: weekByGame.total,
    roomsCreatedThisMonth: monthByGame.total,
    lastResetDate: today,
    weekStartDate: weekStart,
    monthStartDate: currentMonth,
    todayByGame,
    weekByGame,
    monthByGame,
    lastRecalculated: Date.now(),
  };

  // Find most active day in last 7 days
  let mostActiveDay: ExtendedAnalytics['mostActiveDay'] = null;
  for (const day of last7DaysData) {
    if (!mostActiveDay || day.gamesCreated.total > mostActiveDay.gamesCreated) {
      mostActiveDay = {
        date: day.date,
        gamesCreated: day.gamesCreated.total,
      };
    }
  }

  // Build weekly stats for last 4 weeks
  const last4Weeks: WeeklyStats[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - (w * 7));
    const weekMonday = getMondayOfWeek(weekDate);
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);

    const weekStats: WeeklyStats = {
      weekStart: getDateString(weekMonday),
      weekEnd: getDateString(weekSunday),
      gamesCreated: emptyGameStats(),
      dailyBreakdown: {},
      mostActiveDay: getDateString(weekMonday),
      averageGamesPerDay: 0,
    };

    // Count games for this week from room data
    const weekStartMs = weekMonday.getTime();
    const weekEndMs = weekSunday.getTime() + 24 * 60 * 60 * 1000;

    for (const room of rooms) {
      if (room.summary.createdAt >= weekStartMs && room.summary.createdAt < weekEndMs) {
        weekStats.gamesCreated[room.game]++;
        weekStats.gamesCreated.total++;

        const dayKey = getDateString(new Date(room.summary.createdAt));
        if (!weekStats.dailyBreakdown[dayKey]) {
          weekStats.dailyBreakdown[dayKey] = emptyGameStats();
        }
        weekStats.dailyBreakdown[dayKey][room.game]++;
        weekStats.dailyBreakdown[dayKey].total++;
      }
    }

    // Find most active day in week
    let maxGames = 0;
    for (const [day, stats] of Object.entries(weekStats.dailyBreakdown)) {
      if (stats.total > maxGames) {
        maxGames = stats.total;
        weekStats.mostActiveDay = day;
      }
    }

    weekStats.averageGamesPerDay = weekStats.gamesCreated.total / 7;
    last4Weeks.push(weekStats);
  }

  // Build extended analytics
  const extendedAnalytics: ExtendedAnalytics = {
    ...analytics,
    last7Days: last7DaysData,
    last4Weeks,
    mostActiveDay,
  };

  // Sort rooms by lastActiveAt descending
  rooms.sort((a, b) => b.summary.lastActiveAt - a.summary.lastActiveAt);

  return { analytics, extendedAnalytics, rooms };
}

// Get detailed room info including players and roles
export async function getRoomDetails(
  idToken: string,
  game: GameType,
  roomId: string
): Promise<AdminRoomDetail | null> {
  await requireAdmin(idToken);

  const roomRef = await getAdminDbRef(`games/${game}/rooms/${roomId}`);
  const snapshot = await roomRef.once('value');

  if (!snapshot.exists()) {
    return null;
  }

  const room = snapshot.val();

  // Handle werewolf rooms differently
  if (game === 'werewolf') {
    const meta = room.meta || {};
    const playersData = room.players || {};
    
    // Find host from players
    let hostId = '';
    for (const [pid, player] of Object.entries(playersData) as [string, any][]) {
      if (player?.isHost) {
        hostId = pid;
        break;
      }
    }

    // Build player list with roles
    const players: AdminPlayerInfo[] = Object.entries(playersData).map(([id, player]: [string, any]) => {
      return {
        id,
        displayName: player.name || player.displayName || 'Unknown',
        isHost: player.isHost || false,
        role: player.role || undefined,
        joinedAt: player.joinedAt,
      };
    });

    // Sort: host first, then by name
    players.sort((a, b) => {
      if (a.isHost) return -1;
      if (b.isHost) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      roomId,
      game,
      status: meta.status || 'waiting',
      players,
      createdAt: meta.createdAt || Date.now(),
      startedAt: meta.startedAt,
      hostId,
    };
  }

  // Original spyfall logic
  const state = room.state || {};
  const playersData = room.players || {};
  const hostId = state.hostId || Object.keys(playersData)[0] || '';

  // Build player list with roles
  const players: AdminPlayerInfo[] = Object.entries(playersData).map(([id, player]: [string, any]) => {
    const isSpy = state.spyId === id;
    
    return {
      id,
      displayName: player.displayName || 'Unknown',
      isHost: id === hostId,
      isSpy,
      role: isSpy ? '🕵️ SPY' : (state.location ? `📍 ${state.location}` : undefined),
      location: isSpy ? undefined : state.location,
      joinedAt: player.joinedAt,
    };
  });

  // Sort: host first, then by name
  players.sort((a, b) => {
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    roomId,
    game,
    status: state.status || 'waiting',
    players,
    location: state.location,
    spyId: state.spyId,
    createdAt: state.createdAt || Date.now(),
    startedAt: state.startedAt,
    timerDuration: state.timerDuration,
    hostId,
  };
}

// Get rooms filtered by game
export async function getRoomsByGame(
  idToken: string,
  game: GameType
): Promise<{ roomId: string; summary: AdminRoomSummary }[]> {
  await requireAdmin(idToken);

  const roomsRef = await getAdminDbRef(`adminIndex/rooms/${game}`);
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
    const indexRef = await getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');

    if (!indexSnapshot.exists()) {
      return { success: false, message: 'Room not found in index' };
    }

    const currentSummary = indexSnapshot.val() as AdminRoomSummary;

    // Update the actual game room state
    const gameRoomRef = await getAdminDbRef(`games/${game}/rooms/${roomId}`);
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
      const analyticsRef = await getAdminDbRef('adminIndex/analytics');
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

    // Get the actual game room to check status
    const gameRoomRef = await getAdminDbRef(`games/${game}/rooms/${roomId}`);
    const gameRoomSnapshot = await gameRoomRef.once('value');

    if (!gameRoomSnapshot.exists()) {
      return { success: false, message: 'Room not found' };
    }

    const room = gameRoomSnapshot.val();
    
    // Check status based on game type
    let currentStatus: string;
    if (game === 'werewolf') {
      currentStatus = room.meta?.status || 'waiting';
      const activeStatuses = ['night', 'day', 'voting'];
      if (!activeStatuses.includes(currentStatus)) {
        return { success: false, message: 'Room is not currently in an active game phase' };
      }
      // Update werewolf room - uses meta.status
      await gameRoomRef.child('meta').update({
        status: 'ended',
        endedByAdmin: true,
        endedAt: Date.now(),
        endedBy: admin.uid,
      });
    } else {
      currentStatus = room.state?.status || 'waiting';
      if (currentStatus !== 'playing') {
        return { success: false, message: 'Room is not currently playing' };
      }
      // Update spyfall room - uses state.status
      await gameRoomRef.child('state').update({
        status: 'finished',
        endedByAdmin: true,
        endedAt: Date.now(),
        endedBy: admin.uid,
      });
    }

    // Update index if it exists
    const indexRef = await getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');
    if (indexSnapshot.exists()) {
      await indexRef.update({
        status: 'finished',
        lastActiveAt: Date.now(),
      });
    }

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

    // Check if room exists in admin index (optional)
    const indexRef = await getAdminDbRef(`adminIndex/rooms/${game}/${roomId}`);
    const indexSnapshot = await indexRef.once('value');
    const currentSummary = indexSnapshot.exists() ? indexSnapshot.val() as AdminRoomSummary : null;

    // Delete the actual game room
    const gameRoomRef = await getAdminDbRef(`games/${game}/rooms/${roomId}`);
    const gameRoomSnapshot = await gameRoomRef.once('value');
    
    if (!gameRoomSnapshot.exists() && !indexSnapshot.exists()) {
      return { success: false, message: 'Room not found' };
    }

    // Delete the game room if it exists
    if (gameRoomSnapshot.exists()) {
      await gameRoomRef.remove();
    }

    // Delete from index if it exists
    if (indexSnapshot.exists()) {
      await indexRef.remove();
    }

    // Update analytics if room was active
    if (currentSummary && (currentSummary.status === 'waiting' || currentSummary.status === 'playing')) {
      const analyticsRef = await getAdminDbRef('adminIndex/analytics');
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

    const adminRef = await getAdminDbRef(`adminUsers/${targetUid}`);
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

    const adminRef = await getAdminDbRef(`adminUsers/${targetUid}`);
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
