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
  rooms: {
    game: GameType;
    roomId: string;
    summary: AdminRoomSummary;
  }[];
}
