// Admin system types for Virtual Board Zone

export type GameType = 'spyfall' | 'codenames' | 'werewolf';

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed' | 'night' | 'day' | 'voting' | 'ended';

// Room summary stored in /adminIndex/rooms/{game}/{roomId}
export interface AdminRoomSummary {
  status: RoomStatus;
  playerCount: number;
  createdAt: number;
  lastActiveAt: number;
  hostName: string;
  hostId: string;
}

// Per-game stats for a time period
export interface GameStats {
  spyfall: number;
  werewolf: number;
  codenames: number;
  total: number;
}

// Daily activity record stored in /adminIndex/dailyStats/{YYYY-MM-DD}
export interface DailyStats {
  date: string; // YYYY-MM-DD
  gamesCreated: GameStats;
  peakActiveRooms: number;
  peakActivePlayers: number;
  totalPlayersJoined: number;
}

// Weekly summary stored in /adminIndex/weeklyStats/{YYYY-Www}
export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  gamesCreated: GameStats;
  dailyBreakdown: Record<string, GameStats>; // keyed by YYYY-MM-DD
  mostActiveDay: string; // YYYY-MM-DD
  averageGamesPerDay: number;
}

// Analytics data stored in /adminIndex/analytics
export interface AdminAnalytics {
  activeRooms: number;
  activePlayers: number;
  roomsCreatedToday: number;
  roomsCreatedThisWeek: number;
  roomsCreatedThisMonth: number;
  lastResetDate: string; // YYYY-MM-DD
  weekStartDate: string; // YYYY-MM-DD (Monday of current week)
  monthStartDate: string; // YYYY-MM (current month)
  // New: Per-game breakdown for current periods
  todayByGame: GameStats;
  weekByGame: GameStats;
  monthByGame: GameStats;
  // Last recalculation timestamp
  lastRecalculated?: number;
}

// Extended analytics for charts and visualizations
export interface ExtendedAnalytics extends AdminAnalytics {
  // Last 7 days activity for chart
  last7Days: DailyStats[];
  // Last 4 weeks summary
  last4Weeks: WeeklyStats[];
  // Most active day in last 30 days
  mostActiveDay: {
    date: string;
    gamesCreated: number;
  } | null;
}

// Player info for admin view
export interface AdminPlayerInfo {
  id: string;
  displayName: string;
  isHost: boolean;
  isSpy?: boolean;
  role?: string;
  location?: string;
  joinedAt?: number;
}

// Full room detail for admin view
export interface AdminRoomDetail {
  roomId: string;
  game: GameType;
  status: RoomStatus;
  players: AdminPlayerInfo[];
  location?: string; // Current game location (for spyfall)
  spyId?: string; // Who is the spy (for spyfall)
  createdAt: number;
  startedAt?: number;
  timerDuration?: number;
  hostId: string;
}

// Admin user session
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
}

// Response types for admin actions
export interface AdminActionResult {
  success: boolean;
  message: string;
  error?: string;
}

// Dashboard data
export interface AdminDashboardData {
  analytics: AdminAnalytics;
  extendedAnalytics: ExtendedAnalytics;
  rooms: {
    game: GameType;
    roomId: string;
    summary: AdminRoomSummary;
  }[];
}

// Chart data point for visualizations
export interface ChartDataPoint {
  date: string;
  label: string; // formatted date for display
  spyfall: number;
  werewolf: number;
  codenames: number;
  total: number;
}
