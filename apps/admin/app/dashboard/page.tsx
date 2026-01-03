'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  getDashboardData,
  getRoomDetails,
  endGameForRoom,
  deleteRoom,
} from '@/app/actions/admin-actions';
import { AnalyticsChart, GameBreakdownCard, WeeklySummaryCard } from '@/components/AnalyticsChart';
import type { AdminDashboardData, AdminRoomDetail, GameType, RoomStatus } from '@/types';

const ROOMS_PER_PAGE = 10;

type StatusFilter = 'all' | 'active' | 'inactive';
type DashboardTab = 'overview' | 'rooms';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, error, logout, getToken } = useAdminAuth();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<'all' | GameType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomDetail | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const dataLoadedRef = useRef(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Load dashboard data
  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await getDashboardData(token);
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [getToken]);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    } else if (!isLoading && user && !isAdmin) {
      router.push('/');
    } else if (!isLoading && isAdmin && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      loadData();
    }
  }, [isLoading, user, isAdmin, router, loadData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(loadData, 30000); // 30 seconds
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, loadData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRooms(new Set());
  }, [gameFilter, statusFilter, searchQuery]);

  // Handle view room details
  const handleViewRoom = async (game: GameType, roomId: string) => {
    setLoadingRoom(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const details = await getRoomDetails(token, game, roomId);
      setSelectedRoom(details);
    } catch (err) {
      console.error('Failed to load room details:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to load room details');
    } finally {
      setLoadingRoom(false);
    }
  };

  // Handle end game
  const handleEndGame = async (game: GameType, roomId: string) => {
    if (!confirm(`Are you sure you want to end the game in room ${roomId}?`)) return;

    setActionLoading(`end-${roomId}`);
    setActionError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const result = await endGameForRoom(token, game, roomId);
      if (!result.success) {
        setActionError(result.message);
      } else {
        await loadData();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to end game');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (game: GameType, roomId: string) => {
    if (!confirm(`⚠️ Are you sure you want to DELETE room ${roomId}? This cannot be undone!`)) return;

    setActionLoading(`delete-${roomId}`);
    setActionError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const result = await deleteRoom(token, game, roomId);
      if (!result.success) {
        setActionError(result.message);
      } else {
        await loadData();
        setSelectedRooms((prev) => {
          const next = new Set(prev);
          next.delete(`${game}-${roomId}`);
          return next;
        });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRooms.size === 0) return;
    if (!confirm(`⚠️ Delete ${selectedRooms.size} selected rooms? This cannot be undone!`)) return;

    setActionLoading('bulk-delete');
    setActionError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      let successCount = 0;
      let errorCount = 0;

      for (const key of Array.from(selectedRooms)) {
        const [game, roomId] = key.split('-') as [GameType, string];
        try {
          const result = await deleteRoom(token, game, roomId);
          if (result.success) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        setActionError(`Deleted ${successCount} rooms, ${errorCount} failed`);
      }
      
      setSelectedRooms(new Set());
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle room selection
  const toggleRoomSelection = (game: GameType, roomId: string) => {
    const key = `${game}-${roomId}`;
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Export rooms data
  const exportData = () => {
    if (!dashboardData) return;
    
    const exportObj = {
      exportedAt: new Date().toISOString(),
      analytics: dashboardData.analytics,
      rooms: dashboardData.rooms.map(({ game, roomId, summary }) => ({
        game,
        roomId,
        ...summary,
        createdAt: new Date(summary.createdAt).toISOString(),
        lastActiveAt: new Date(summary.lastActiveAt).toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show loading state
  if (isLoading || (user && isAdmin && loadingData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if not admin
  if (error || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Access denied'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Active statuses
  const activeStatuses: RoomStatus[] = ['waiting', 'playing', 'night', 'day', 'voting'];
  const inactiveStatuses: RoomStatus[] = ['finished', 'ended', 'closed'];

  // Filter rooms
  const filteredRooms = (dashboardData?.rooms || []).filter((room) => {
    // Game filter
    if (gameFilter !== 'all' && room.game !== gameFilter) return false;
    
    // Status filter
    if (statusFilter === 'active' && !activeStatuses.includes(room.summary.status)) return false;
    if (statusFilter === 'inactive' && !inactiveStatuses.includes(room.summary.status)) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        room.roomId.toLowerCase().includes(query) ||
        room.summary.hostName.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Sort by last active (newest first)
  filteredRooms.sort((a, b) => b.summary.lastActiveAt - a.summary.lastActiveAt);

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * ROOMS_PER_PAGE,
    currentPage * ROOMS_PER_PAGE
  );

  const statusColors: Record<string, string> = {
    waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    playing: 'bg-green-500/20 text-green-400 border-green-500/30',
    night: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    day: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    voting: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    finished: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ended: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    closed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const gameColors: Record<GameType, string> = {
    spyfall: 'bg-emerald-500/20 text-emerald-400',
    werewolf: 'bg-red-500/20 text-red-400',
    codenames: 'bg-blue-500/20 text-blue-400',
  };

  const gameIcons: Record<GameType, string> = {
    spyfall: '🕵️',
    werewolf: '🐺',
    codenames: '🔤',
  };

  // Time ago helper
  const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Select all visible rooms
  const toggleSelectAll = () => {
    if (selectedRooms.size === paginatedRooms.length) {
      setSelectedRooms(new Set());
    } else {
      setSelectedRooms(new Set(paginatedRooms.map(r => `${r.game}-${r.roomId}`)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold">Admin Dashboard</h1>
            {lastRefresh && (
              <span className="hidden md:inline text-xs text-gray-500">
                Updated {timeAgo(lastRefresh.getTime())}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden md:inline text-gray-400 text-sm truncate max-w-[150px]">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Action Error */}
        {actionError && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 flex items-center justify-between text-sm">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="ml-4 text-red-300 hover:text-red-200 text-lg"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            🏠 Rooms ({dashboardData?.rooms.length || 0})
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-white mb-1">
                  {dashboardData?.analytics.activeRooms || 0}
                </div>
                <div className="text-gray-400 text-xs">Active Rooms</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-white mb-1">
                  {dashboardData?.analytics.activePlayers || 0}
                </div>
                <div className="text-gray-400 text-xs">Active Players</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-green-400 mb-1">
                  {dashboardData?.analytics.roomsCreatedToday || 0}
                </div>
                <div className="text-gray-400 text-xs">Today</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-blue-400 mb-1">
                  {dashboardData?.analytics.roomsCreatedThisWeek || 0}
                </div>
                <div className="text-gray-400 text-xs">This Week</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-purple-400 mb-1">
                  {dashboardData?.analytics.roomsCreatedThisMonth || 0}
                </div>
                <div className="text-gray-400 text-xs">This Month</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
                <div className="text-xl md:text-2xl font-bold text-white mb-1">
                  {dashboardData?.rooms.length || 0}
                </div>
                <div className="text-gray-400 text-xs">Total Rooms</div>
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="space-y-6 mb-8">
              {/* Daily Activity Chart */}
              {dashboardData?.extendedAnalytics?.last7Days && (
                <AnalyticsChart
                  data={dashboardData.extendedAnalytics.last7Days}
                  title="Daily Game Activity (Last 7 Days)"
                  showLegend={true}
                />
              )}

              {/* Game Breakdown and Weekly Trend side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dashboardData?.extendedAnalytics && (
                  <GameBreakdownCard
                    todayByGame={dashboardData.extendedAnalytics.todayByGame}
                    weekByGame={dashboardData.extendedAnalytics.weekByGame}
                  />
                )}
                {dashboardData?.extendedAnalytics?.last4Weeks && (
                  <WeeklySummaryCard last4Weeks={dashboardData.extendedAnalytics.last4Weeks} />
                )}
              </div>

              {/* Most Active Day Highlight */}
              {dashboardData?.extendedAnalytics?.mostActiveDay && dashboardData.extendedAnalytics.mostActiveDay.gamesCreated > 0 && (
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="text-sm text-yellow-400 font-medium">Most Active Day (Last 7 Days)</p>
                      <p className="text-lg font-bold text-white">
                        {new Date(dashboardData.extendedAnalytics.mostActiveDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                        <span className="text-yellow-400 ml-2">
                          — {dashboardData.extendedAnalytics.mostActiveDay.gamesCreated} games created
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <>
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-white mb-1">
              {dashboardData?.analytics.activeRooms || 0}
            </div>
            <div className="text-gray-400 text-xs">Active Rooms</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-white mb-1">
              {dashboardData?.analytics.activePlayers || 0}
            </div>
            <div className="text-gray-400 text-xs">Active Players</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-green-400 mb-1">
              {dashboardData?.analytics.roomsCreatedToday || 0}
            </div>
            <div className="text-gray-400 text-xs">Today</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-blue-400 mb-1">
              {dashboardData?.analytics.roomsCreatedThisWeek || 0}
            </div>
            <div className="text-gray-400 text-xs">This Week</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-purple-400 mb-1">
              {dashboardData?.analytics.roomsCreatedThisMonth || 0}
            </div>
            <div className="text-gray-400 text-xs">This Month</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4 border border-gray-800">
            <div className="text-xl md:text-2xl font-bold text-white mb-1">
              {dashboardData?.rooms.length || 0}
            </div>
            <div className="text-gray-400 text-xs">Total Rooms</div>
          </div>
        </div>

        {/* Room List Header */}
        <div className="mb-4 md:mb-6">
          {/* Title & Actions Row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Rooms</h2>
            <div className="flex items-center gap-2">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="md:hidden px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              
              {/* Desktop Action Buttons */}
              <div className="hidden md:flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  Auto-refresh
                </label>
                <button
                  onClick={exportData}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
              
              <button
                onClick={loadData}
                disabled={loadingData}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden md:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className={`${showMobileFilters ? 'flex flex-col' : 'hidden'} md:flex md:flex-row space-y-3 md:space-y-0 md:items-center md:gap-3`}>
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by room ID or host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value as 'all' | GameType)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Games</option>
                <option value="spyfall">🕵️ Spyfall</option>
                <option value="werewolf">🐺 Werewolf</option>
                <option value="codenames">🔤 Codenames</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">🟢 Active</option>
                <option value="inactive">⚫ Inactive</option>
              </select>
            </div>

            {/* Mobile extra buttons */}
            <div className="flex md:hidden items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
                />
                Auto-refresh
              </label>
              <button
                onClick={exportData}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                Export
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRooms.size > 0 && (
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-300">
                {selectedRooms.size} room{selectedRooms.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRooms(new Set())}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={actionLoading === 'bulk-delete'}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading === 'bulk-delete' ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 mb-3">
          {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found
        </div>

        {/* Room List - Desktop Table */}
        <div className="hidden lg:block bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRooms.size === paginatedRooms.length && paginatedRooms.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Room ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Game
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No rooms found
                    </td>
                  </tr>
                ) : (
                  paginatedRooms.map(({ game, roomId, summary }) => (
                    <tr key={`${game}-${roomId}`} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRooms.has(`${game}-${roomId}`)}
                          onChange={() => toggleRoomSelection(game, roomId)}
                          className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm bg-gray-800 px-2 py-1 rounded">{roomId}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${gameColors[game]}`}>
                          {gameIcons[game]} {game}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${statusColors[summary.status] || statusColors.waiting}`}
                        >
                          {summary.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-sm">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {summary.playerCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 truncate max-w-[120px]">
                        {summary.hostName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {timeAgo(summary.lastActiveAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewRoom(game, roomId)}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {activeStatuses.includes(summary.status) && (
                            <button
                              onClick={() => handleEndGame(game, roomId)}
                              disabled={actionLoading === `end-${roomId}`}
                              className="p-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-xs transition-colors disabled:opacity-50"
                              title="End Game"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRoom(game, roomId)}
                            disabled={actionLoading === `delete-${roomId}`}
                            className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors disabled:opacity-50"
                            title="Delete Room"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room List - Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {paginatedRooms.length === 0 ? (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center text-gray-500">
              No rooms found
            </div>
          ) : (
            paginatedRooms.map(({ game, roomId, summary }) => (
              <div
                key={`${game}-${roomId}`}
                className={`bg-gray-900 rounded-lg border ${
                  selectedRooms.has(`${game}-${roomId}`) ? 'border-blue-500' : 'border-gray-800'
                } overflow-hidden`}
              >
                {/* Card Header */}
                <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRooms.has(`${game}-${roomId}`)}
                      onChange={() => toggleRoomSelection(game, roomId)}
                      className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">{roomId}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${gameColors[game]}`}>
                      {gameIcons[game]}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full border ${statusColors[summary.status] || statusColors.waiting}`}
                  >
                    {summary.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 text-xs">Host</span>
                      <p className="text-gray-200 truncate">{summary.hostName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Players</span>
                      <p className="text-gray-200">{summary.playerCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Last Active</span>
                      <p className="text-gray-200">{timeAgo(summary.lastActiveAt)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Game</span>
                      <p className="text-gray-200 capitalize">{game}</p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => handleViewRoom(game, roomId)}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    {activeStatuses.includes(summary.status) && (
                      <button
                        onClick={() => handleEndGame(game, roomId)}
                        disabled={actionLoading === `end-${roomId}`}
                        className="py-2 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `end-${roomId}` ? '...' : 'End'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRoom(game, roomId)}
                      disabled={actionLoading === `delete-${roomId}`}
                      className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `delete-${roomId}` ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 md:mt-6 bg-gray-900 rounded-lg border border-gray-800 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-400 text-center md:text-left">
              Showing {(currentPage - 1) * ROOMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ROOMS_PER_PAGE, filteredRooms.length)} of{' '}
              {filteredRooms.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 py-1 text-sm text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {/* Room Details Modal */}
        {(selectedRoom || loadingRoom) && (
          <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-gray-900 rounded-t-2xl md:rounded-lg border-t md:border border-gray-700 w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden">
              {loadingRoom ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading room details...</p>
                </div>
              ) : selectedRoom ? (
                <>
                  {/* Modal Header */}
                  <div className="px-4 md:px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Room: {selectedRoom.roomId}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${gameColors[selectedRoom.game]}`}>
                          {gameIcons[selectedRoom.game]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{selectedRoom.game}</p>
                    </div>
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="text-gray-400 hover:text-white p-2 -mr-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh]">
                    {/* Room Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <span className="text-gray-500 text-xs">Status</span>
                        <p className={`font-medium ${
                          selectedRoom.status === 'playing' || selectedRoom.status === 'day' ? 'text-green-400' :
                          selectedRoom.status === 'waiting' ? 'text-yellow-400' :
                          selectedRoom.status === 'night' ? 'text-purple-400' :
                          selectedRoom.status === 'voting' ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>
                          {selectedRoom.status.toUpperCase()}
                        </p>
                      </div>
                      {selectedRoom.location && (
                        <div className="bg-gray-800 rounded-lg p-3">
                          <span className="text-gray-500 text-xs">Location</span>
                          <p className="font-medium text-blue-400">📍 {selectedRoom.location}</p>
                        </div>
                      )}
                      <div className="bg-gray-800 rounded-lg p-3">
                        <span className="text-gray-500 text-xs">Created</span>
                        <p className="font-medium text-sm">{new Date(selectedRoom.createdAt).toLocaleString()}</p>
                      </div>
                      {selectedRoom.startedAt && (
                        <div className="bg-gray-800 rounded-lg p-3">
                          <span className="text-gray-500 text-xs">Started</span>
                          <p className="font-medium text-sm">{new Date(selectedRoom.startedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Players List */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Players ({selectedRoom.players.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedRoom.players.map((player) => (
                          <div
                            key={player.id}
                            className={`p-3 rounded-lg border ${
                              player.isSpy 
                                ? 'bg-red-900/30 border-red-700' 
                                : 'bg-gray-800 border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{player.displayName}</span>
                                {player.isHost && (
                                  <span className="px-2 py-0.5 bg-purple-600/30 text-purple-400 text-xs rounded">
                                    HOST
                                  </span>
                                )}
                              </div>
                              {player.role && (
                                <span className={`text-sm ${
                                  player.isSpy ? 'text-red-400 font-bold' : 'text-gray-400'
                                }`}>
                                  {player.role}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                              ID: {player.id}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-4 md:px-6 py-4 border-t border-gray-700 flex justify-end gap-2 sticky bottom-0 bg-gray-900">
                    {activeStatuses.includes(selectedRoom.status) && (
                      <button
                        onClick={() => {
                          handleEndGame(selectedRoom.game, selectedRoom.roomId);
                          setSelectedRoom(null);
                        }}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors"
                      >
                        End Game
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleDeleteRoom(selectedRoom.game, selectedRoom.roomId);
                        setSelectedRoom(null);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                    >
                      Delete Room
                    </button>
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
