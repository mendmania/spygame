import { Card, CardHeader, CardContent } from '@vbz/ui';

const SPYFALL_URL = process.env.NEXT_PUBLIC_SPYFALL_URL || 'https://spyfall.virtualboardzone.com';

const GAMES = [
  {
    id: 'spyfall',
    name: 'Spyfall',
    description: 'One spy. One secret location. Find the spy before time runs out!',
    players: '4-10',
    duration: '8 min',
    href: SPYFALL_URL,
    available: true,
  },
  {
    id: 'codenames',
    name: 'Codenames',
    description: 'Give one-word clues to help your team find their agents.',
    players: '4-8',
    duration: '15 min',
    href: '#',
    available: false,
  },
  {
    id: 'werewolf',
    name: 'Werewolf',
    description: 'Villagers vs Werewolves. Deduce who the werewolves are before it\'s too late.',
    players: '6-12',
    duration: '20 min',
    href: '#',
    available: false,
  },
];

export default function HomePage() {
  return (
    <div className="px-6">
      {/* Hero Section */}
      <section className="py-20 text-center max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold mb-6">
          Play Party Games Online
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          No downloads, no sign-ups required. Just share a link and play with friends.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href={SPYFALL_URL}
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-6 text-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Play Spyfall
          </a>
          <a
            href="#games"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-6 text-lg border border-gray-300 hover:bg-gray-800 transition-colors"
          >
            Browse Games
          </a>
        </div>
      </section>

      {/* Games Section */}
      <section id="games" className="py-16 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-12">Available Games</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Card key={game.id} className={!game.available ? 'opacity-60' : ''}>
              <CardHeader>
                <h4 className="text-xl font-semibold">{game.name}</h4>
                {!game.available && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full w-fit">
                    Coming Soon
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4">{game.description}</p>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>👥 {game.players}</span>
                  <span>⏱️ {game.duration}</span>
                </div>
                {game.available ? (
                  <a
                    href={game.href}
                    className="block w-full text-center rounded-lg font-medium h-10 leading-10 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Play Now
                  </a>
                ) : (
                  <span className="block w-full text-center rounded-lg font-medium h-10 leading-10 bg-gray-700 text-gray-400 cursor-not-allowed">
                    Coming Soon
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 max-w-3xl mx-auto text-center">
        <h3 className="text-3xl font-bold mb-6">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div>
            <div className="text-3xl mb-3">1️⃣</div>
            <h4 className="font-semibold mb-2">Choose a Game</h4>
            <p className="text-gray-400 text-sm">Pick from our selection of party games.</p>
          </div>
          <div>
            <div className="text-3xl mb-3">2️⃣</div>
            <h4 className="font-semibold mb-2">Create a Room</h4>
            <p className="text-gray-400 text-sm">Get a unique room code to share with friends.</p>
          </div>
          <div>
            <div className="text-3xl mb-3">3️⃣</div>
            <h4 className="font-semibold mb-2">Play Together</h4>
            <p className="text-gray-400 text-sm">Everyone joins with the code and you're ready!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
