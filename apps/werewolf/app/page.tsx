'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardContent } from '@vbz/ui';
import { generateRoomId } from '@vbz/game-core/utils';

export default function WerewolfLobbyPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = () => {
    setIsCreating(true);
    const newRoomId = generateRoomId();
    router.push(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-red-500">🐺</span> WEREWOLF
          </h1>
          <p className="text-gray-400">
            One Night Ultimate Werewolf - Find the werewolves before it's too late!
          </p>
        </div>

        {/* Create Room */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Start a New Game</h2>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-950 px-2 text-gray-500">
              Or join existing room
            </span>
          </div>
        </div>

        {/* Join Room */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Join a Room</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-center text-xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                maxLength={6}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={!roomCode.trim()}
              >
                Join Room
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Game Info */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-300">How to Play</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• 3-10 players, each gets a secret role</li>
            <li>• Werewolves try to stay hidden</li>
            <li>• Villagers try to find the werewolves</li>
            <li>• Night phase: Use your special ability</li>
            <li>• Day phase: Discuss and vote!</li>
          </ul>
        </div>

        {/* Player Info */}
        <p className="text-center text-gray-500 text-sm">
          Need 3-10 players to play. Game lasts about 10 minutes.
        </p>
      </div>
    </div>
  );
}
