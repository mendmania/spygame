// Admin system types for Virtual Board Zone

export type GameType = 'spyfall' | 'codenames' | 'werewolf';

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';

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
  lastResetDate: string; // YYYY-MM-DD
}

// Full room data for admin view
export interface AdminRoomDetail extends AdminRoomSummary {
  roomId: string;
  game: GameType;
  players: {
    id: string;
    name: string;
    isHost: boolean;
  }[];
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
