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
import type { AdminDashboardData, AdminRoomDetail, GameType } from '@/types';

const ROOMS_PER_PAGE = 10;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, error, logout, getToken } = useAdminAuth();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | GameType>('all');
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomDetail | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const dataLoadedRef = useRef(false);

  // Load dashboard data
  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await getDashboardData(token);
      setDashboardData(data);
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

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setActionLoading(null);
    }
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

  const filteredRooms = dashboardData?.rooms.filter(
    (room) => filter === 'all' || room.game === filter
  ) || [];

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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Action Error */}
        {actionError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-4 text-red-300 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white mb-1">
              {dashboardData?.analytics.activeRooms || 0}
            </div>
            <div className="text-gray-400 text-xs">Active Rooms</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white mb-1">
              {dashboardData?.analytics.activePlayers || 0}
            </div>
            <div className="text-gray-400 text-xs">Active Players</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {dashboardData?.analytics.roomsCreatedToday || 0}
            </div>
            <div className="text-gray-400 text-xs">Rooms Today</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {dashboardData?.analytics.roomsCreatedThisWeek || 0}
            </div>
            <div className="text-gray-400 text-xs">Rooms This Week</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {dashboardData?.analytics.roomsCreatedThisMonth || 0}
            </div>
            <div className="text-gray-400 text-xs">Rooms This Month</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white mb-1">
              {dashboardData?.rooms.length || 0}
            </div>
            <div className="text-gray-400 text-xs">Total Rooms</div>
          </div>
        </div>

        {/* Room List Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Rooms</h2>
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | GameType)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Games</option>
              <option value="spyfall">Spyfall</option>
              <option value="codenames">Codenames</option>
              <option value="werewolf">Werewolf</option>
            </select>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Room ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No rooms found
                  </td>
                </tr>
              ) : (
                paginatedRooms.map(({ game, roomId, summary }) => (
                  <tr key={`${game}-${roomId}`} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{roomId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{game}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${statusColors[summary.status] || statusColors.waiting}`}
                      >
                        {summary.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {summary.playerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {summary.hostName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(summary.lastActiveAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewRoom(game, roomId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                        >
                          View
                        </button>
                        {['playing', 'night', 'day', 'voting'].includes(summary.status) && (
                          <button
                            onClick={() => handleEndGame(game, roomId)}
                            disabled={actionLoading === `end-${roomId}`}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `end-${roomId}` ? '...' : 'End Game'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRoom(game, roomId)}
                          disabled={actionLoading === `delete-${roomId}`}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `delete-${roomId}` ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {(currentPage - 1) * ROOMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ROOMS_PER_PAGE, filteredRooms.length)} of{' '}
                {filteredRooms.length} rooms
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Room Details Modal */}
        {(selectedRoom || loadingRoom) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {loadingRoom ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading room details...</p>
                </div>
              ) : selectedRoom ? (
                <>
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Room: {selectedRoom.roomId}</h3>
                      <p className="text-sm text-gray-400 capitalize">{selectedRoom.game}</p>
                    </div>
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Room Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <span className="text-gray-400 text-sm">Status</span>
                        <p className={`font-medium ${
                          selectedRoom.status === 'playing' ? 'text-green-400' :
                          selectedRoom.status === 'waiting' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {selectedRoom.status.toUpperCase()}
                        </p>
                      </div>
                      {selectedRoom.location && (
                        <div>
                          <span className="text-gray-400 text-sm">Location</span>
                          <p className="font-medium text-blue-400">📍 {selectedRoom.location}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400 text-sm">Created</span>
                        <p className="font-medium">{new Date(selectedRoom.createdAt).toLocaleString()}</p>
                      </div>
                      {selectedRoom.startedAt && (
                        <div>
                          <span className="text-gray-400 text-sm">Started</span>
                          <p className="font-medium">{new Date(selectedRoom.startedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Players List */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-3">
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
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              ID: {player.id}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
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
