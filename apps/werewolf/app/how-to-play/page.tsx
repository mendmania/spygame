import { Metadata } from 'next';
import Link from 'next/link';
import { HowToSchema, FAQSchema, VideoGameSchema, BreadcrumbSchema } from '@vbz/ui';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://werewolf.virtualboardzone.com';
const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';

export const metadata: Metadata = {
  title: 'How to Play One Night Werewolf Online - Rules, Roles & Strategy Guide',
  description: 'Learn how to play One Night Ultimate Werewolf online. Complete guide to all roles, night actions, winning strategies, and tips for both werewolves and villagers!',
  keywords: [
    'how to play werewolf',
    'one night werewolf rules',
    'werewolf game strategy',
    'werewolf roles explained',
    'one night ultimate werewolf guide',
    'werewolf online tutorial',
    'mafia game rules',
    'social deduction werewolf',
  ],
  openGraph: {
    title: 'How to Play One Night Werewolf - Complete Rules & Strategy Guide',
    description: 'Master One Night Ultimate Werewolf with our complete guide. Learn all roles, strategies, and pro tips!',
    url: `${baseUrl}/how-to-play`,
    type: 'article',
  },
  alternates: {
    canonical: `${baseUrl}/how-to-play`,
  },
};

const howToSteps = [
  {
    name: 'Create or Join a Room',
    text: 'One player creates a room and shares the 6-letter room code with friends (3-10 players).',
  },
  {
    name: 'Select Roles',
    text: 'The host chooses which roles to include in the game. Each player gets a role, plus 3 extra roles go to the center.',
  },
  {
    name: 'Night Phase',
    text: 'Everyone closes their eyes. Roles wake up one by one in order and perform their special abilities.',
  },
  {
    name: 'Day Phase Discussion',
    text: 'All players open their eyes and discuss. Share information (or lies!) to figure out who the werewolves are.',
  },
  {
    name: 'Vote',
    text: 'After discussion, everyone simultaneously votes for who they think is a werewolf.',
  },
  {
    name: 'Reveal & Win',
    text: 'The player(s) with the most votes die. If a werewolf dies, the village wins! If no werewolves die, werewolves win!',
  },
];

const faqItems = [
  {
    question: 'How many players do you need for One Night Werewolf?',
    answer: 'One Night Werewolf plays with 3-10 players. The sweet spot is 5-8 players for the best experience with meaningful deduction.',
  },
  {
    question: 'How long does a game of One Night Werewolf take?',
    answer: 'A single game takes about 10 minutes - 3 minutes for the night phase and 5-7 minutes for day discussion. Quick rounds mean you can play multiple games!',
  },
  {
    question: 'What\'s the difference between Werewolf and Mafia?',
    answer: 'One Night Werewolf is similar to Mafia but plays in a single round with no player elimination during the game. Everyone participates until the final vote.',
  },
  {
    question: 'What are the center cards for?',
    answer: 'The 3 center cards add uncertainty. Some roles like the Robber and Drunk can swap cards with the center, meaning you might not have your original role!',
  },
  {
    question: 'What happens if there are no werewolves?',
    answer: 'If all werewolf cards end up in the center, the village must vote for no one to win. If anyone dies in this case, the village loses.',
  },
  {
    question: 'Can my role change during the game?',
    answer: 'Yes! Roles like Robber, Drunk, and Troublemaker can move cards around during the night. Your final role (the one in front of you at voting) determines your team.',
  },
  {
    question: 'Is One Night Werewolf free to play online?',
    answer: 'Yes! The basic game with all standard roles is completely free. No downloads or sign-ups required.',
  },
  {
    question: 'What\'s the best strategy for werewolves?',
    answer: 'Werewolves should claim a village role confidently, support other village claims to seem helpful, and try to cast doubt on actual villagers.',
  },
];

export default function HowToPlayPage() {
  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbSchema
        items={[
          { name: 'Virtual Board Zone', url: hubUrl },
          { name: 'Werewolf', url: baseUrl },
          { name: 'How to Play', url: `${baseUrl}/how-to-play` },
        ]}
      />
      <HowToSchema
        name="How to Play One Night Werewolf Online"
        description="Complete guide to playing One Night Ultimate Werewolf, the fast-paced social deduction party game."
        totalTime="PT15M"
        steps={howToSteps}
      />
      <FAQSchema items={faqItems} />
      <VideoGameSchema
        name="One Night Werewolf Online"
        description="Play One Night Ultimate Werewolf online for free - a fast-paced social deduction party game for 3-10 players"
        url={baseUrl}
        genre={['Social Deduction', 'Party Game', 'Hidden Role']}
        numberOfPlayers={{ min: 3, max: 10 }}
        playMode={['MultiPlayer']}
        gamePlatform={['Web Browser']}
        offers={{ price: 0, priceCurrency: 'USD' }}
        author={{ name: 'Virtual Board Zone', url: hubUrl }}
      />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href={hubUrl} className="text-red-400 hover:text-red-300">
                Home
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link href="/" className="text-red-400 hover:text-red-300">
                Werewolf
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-400">How to Play</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How to Play One Night Werewolf
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Master the art of deception in this fast-paced social deduction game. 
            Hunt the werewolves or survive as one - all in just 10 minutes!
          </p>
        </header>

        {/* Quick Start CTA */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-xl p-6 mb-12 text-center">
          <p className="text-lg mb-4">Ready to hunt some werewolves?</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Play Werewolf Free
          </Link>
        </div>

        {/* Game Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What is One Night Werewolf?</h2>
          <p className="text-gray-300 mb-4">
            One Night Ultimate Werewolf is a fast-paced social deduction game where players 
            are secretly assigned roles. <strong>Werewolves</strong> try to survive while 
            <strong> villagers</strong> try to identify and eliminate at least one werewolf. 
            The twist? Roles can swap during the night phase!
          </p>
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="font-semibold">3-10 Players</div>
              <div className="text-sm text-gray-400">Quick setup</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="font-semibold">10 Minutes</div>
              <div className="text-sm text-gray-400">Per game</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🌙</div>
              <div className="font-semibold">Night Actions</div>
              <div className="text-sm text-gray-400">Special powers</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🗳️</div>
              <div className="font-semibold">One Vote</div>
              <div className="text-sm text-gray-400">Winner take all</div>
            </div>
          </div>
        </section>

        {/* Step by Step Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How to Play - Step by Step</h2>
          <div className="space-y-6">
            {howToSteps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{step.name}</h3>
                  <p className="text-gray-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Win Conditions */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Win Conditions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">
                🏘️ Village Team Wins If...
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  At least one werewolf is killed in the final vote
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  OR no werewolves exist AND no one is killed
                </li>
              </ul>
            </div>
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-400">
                🐺 Werewolf Team Wins If...
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  No werewolves are killed in the final vote
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  OR no werewolves exist BUT someone is killed
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Night Phase Explanation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">The Night Phase</h2>
          <p className="text-gray-400 mb-6">
            During the night, roles wake up one at a time (in order) to perform their 
            special abilities. This happens automatically in our online version!
          </p>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Night Action Order:</h3>
            <ol className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-red-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                <span><strong>Werewolves</strong> - See each other</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-red-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                <span><strong>Minion</strong> - Sees who the werewolves are</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                <span><strong>Masons</strong> - See each other</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                <span><strong>Seer</strong> - Looks at another player's card OR two center cards</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                <span><strong>Robber</strong> - May swap with another player and see new role</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
                <span><strong>Troublemaker</strong> - Swaps two other players' cards (blindly)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-yellow-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
                <span><strong>Drunk</strong> - Swaps their card with a center card (doesn't look)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
                <span><strong>Insomniac</strong> - Looks at their own card (sees if it changed)</span>
              </li>
            </ol>
          </div>
        </section>

        {/* Strategy Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Winning Strategies</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Village Strategy */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">
                🏘️ Village Strategy
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  Share information early - Seers, Robbers, reveal what you know!
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  Cross-reference claims - Do stories add up?
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  Watch for defensive reactions
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">✓</span>
                  Consider the center cards - missing werewolves?
                </li>
              </ul>
            </div>

            {/* Werewolf Strategy */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-400">
                🐺 Werewolf Strategy
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Claim a role confidently and early
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Support other players' claims to seem helpful
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Cast subtle doubt on villagers
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  If caught, claim you were swapped!
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="bg-gray-800/50 rounded-lg p-4 group"
              >
                <summary className="font-semibold cursor-pointer flex items-center justify-between">
                  {item.question}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-gray-400 pl-4 border-l-2 border-red-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Hunt Werewolves?</h2>
          <p className="text-gray-400 mb-6">
            Now that you know the rules, gather your friends and start playing!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Play Werewolf Now
            </Link>
            <Link
              href="/roles"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              View All Roles
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
