import { Metadata } from 'next';
import Link from 'next/link';
import { HowToSchema, FAQSchema, VideoGameSchema, BreadcrumbSchema } from '@vbz/ui';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spyfall.virtualboardzone.com';
const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';

export const metadata: Metadata = {
  title: 'How to Play Spyfall Online - Rules, Tips & Strategy Guide',
  description: 'Learn how to play Spyfall online with our complete guide. Master the rules, discover winning strategies for both spy and non-spy players, and become the ultimate spy hunter!',
  keywords: [
    'how to play spyfall',
    'spyfall rules',
    'spyfall strategy',
    'spyfall tips',
    'spyfall guide',
    'spyfall online tutorial',
    'spy game rules',
    'spyfall questions',
  ],
  openGraph: {
    title: 'How to Play Spyfall Online - Complete Rules & Strategy Guide',
    description: 'Master Spyfall with our complete guide. Learn rules, winning strategies, and pro tips for finding the spy!',
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
    text: 'One player creates a room and shares the 6-letter room code with friends. Other players join using this code.',
  },
  {
    name: 'Wait for Players',
    text: 'Wait until 4-10 players have joined. The more players, the more exciting the game becomes!',
  },
  {
    name: 'Start the Game',
    text: 'The host starts the game. Each player receives a secret card - either a location and role, or the SPY card.',
  },
  {
    name: 'Ask Questions',
    text: 'Players take turns asking each other questions about the location. Questions should be clever but not too obvious!',
  },
  {
    name: 'Find the Spy or Guess the Location',
    text: 'Non-spies try to identify who the spy is through their answers. The spy tries to figure out the location.',
  },
  {
    name: 'Vote or Guess',
    text: 'When time runs out or players are ready, vote to accuse a player. The spy can also guess the location to win.',
  },
];

const faqItems = [
  {
    question: 'How many players do you need for Spyfall?',
    answer: 'Spyfall works best with 4-10 players. The minimum is 4 players, but 6-8 players provides the ideal experience with enough variety in questioning and discussion.',
  },
  {
    question: 'How long does a game of Spyfall take?',
    answer: 'A typical game of Spyfall lasts about 8 minutes. You can adjust the timer in game settings to make games shorter (5 minutes) or longer (10 minutes).',
  },
  {
    question: 'What happens if the spy is caught?',
    answer: 'If players correctly vote to accuse the spy, the non-spy players win! However, even when accused, the spy gets one final chance to guess the location to steal the victory.',
  },
  {
    question: 'Can the spy win after being caught?',
    answer: 'Yes! When accused, the spy can make a final guess at the location. If correct, the spy wins despite being caught.',
  },
  {
    question: 'What kind of questions should I ask in Spyfall?',
    answer: 'Ask questions that someone at the location would know, but that don\'t give away the location to the spy. For example, at a beach, ask "Do you need sunscreen here?" rather than "Is this a beach?"',
  },
  {
    question: 'How does the spy figure out the location?',
    answer: 'The spy listens carefully to questions and answers from other players. Patterns in questioning and reactions can reveal clues about the secret location.',
  },
  {
    question: 'Is Spyfall free to play online?',
    answer: 'Yes! Basic Spyfall is completely free to play with standard locations. Premium custom categories are available for players who want to create their own unique game experiences.',
  },
  {
    question: 'Do I need to download anything to play Spyfall?',
    answer: 'No downloads required! Spyfall runs entirely in your web browser. Just share the room code with friends and start playing instantly.',
  },
];

export default function HowToPlayPage() {
  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbSchema
        items={[
          { name: 'Virtual Board Zone', url: hubUrl },
          { name: 'Spyfall', url: baseUrl },
          { name: 'How to Play', url: `${baseUrl}/how-to-play` },
        ]}
      />
      <HowToSchema
        name="How to Play Spyfall Online"
        description="Complete guide to playing Spyfall, the social deduction party game where players try to find the spy among them."
        totalTime="PT10M"
        steps={howToSteps}
      />
      <FAQSchema items={faqItems} />
      <VideoGameSchema
        name="Spyfall Online"
        description="Play Spyfall online for free - a thrilling social deduction party game for 4-10 players"
        url={baseUrl}
        genre={['Social Deduction', 'Party Game', 'Deduction']}
        numberOfPlayers={{ min: 4, max: 10 }}
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
              <Link href={hubUrl} className="text-blue-400 hover:text-blue-300">
                Home
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link href="/" className="text-blue-400 hover:text-blue-300">
                Spyfall
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-400">How to Play</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How to Play Spyfall Online
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Master the art of deception and deduction in this thrilling party game. 
            Learn the rules, discover winning strategies, and become the ultimate spy hunter!
          </p>
        </header>

        {/* Quick Start CTA */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-12 text-center">
          <p className="text-lg mb-4">Ready to play? Start a game now!</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Play Spyfall Free
          </Link>
        </div>

        {/* Game Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What is Spyfall?</h2>
          <p className="text-gray-300 mb-4">
            Spyfall is a social deduction party game where players are given a secret location, 
            except for one player - <strong>the spy</strong>. Through clever questioning and careful 
            observation, players must identify the spy before time runs out, while the spy tries to 
            figure out the location or avoid detection.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="font-semibold">4-10 Players</div>
              <div className="text-sm text-gray-400">Perfect for parties</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="font-semibold">8 Minutes</div>
              <div className="text-sm text-gray-400">Quick rounds</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🎭</div>
              <div className="font-semibold">Deception</div>
              <div className="text-sm text-gray-400">Bluff & deduce</div>
            </div>
          </div>
        </section>

        {/* Step by Step Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How to Play - Step by Step</h2>
          <div className="space-y-6">
            {howToSteps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
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

        {/* Strategy Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Winning Strategies</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Non-Spy Strategy */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-green-400">
                🔍 Finding the Spy
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-green-400">✓</span>
                  Ask questions only someone at the location would understand
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">✓</span>
                  Watch for vague or deflecting answers
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">✓</span>
                  Notice who asks overly general questions
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">✓</span>
                  Pay attention to body language and hesitation
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">✓</span>
                  Coordinate with other players through questioning
                </li>
              </ul>
            </div>

            {/* Spy Strategy */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-400">
                🕵️ Playing as Spy
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Listen carefully to all questions and answers
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Give answers that could fit multiple locations
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Ask questions that seem location-specific but aren't
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Blend in by mimicking other players' confidence
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✓</span>
                  Consider guessing the location before time runs out
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Question Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Good vs Bad Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                ✅ Good Questions
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>"What's the dress code here?"</li>
                <li>"Would you bring a date to this place?"</li>
                <li>"Is it noisy here?"</li>
                <li>"Do people come here often?"</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                These questions are specific enough to catch a spy, but vague enough not to reveal the location.
              </p>
            </div>
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-400">
                ❌ Bad Questions
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>"Is this a restaurant?"</li>
                <li>"Are there doctors here?"</li>
                <li>"Is this location in water?"</li>
                <li>"Do people sleep here?"</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                These questions give too much information to the spy about the location.
              </p>
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
                <p className="mt-3 text-gray-400 pl-4 border-l-2 border-blue-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Find the Spy?</h2>
          <p className="text-gray-400 mb-6">
            Now that you know the rules, gather your friends and start playing!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Play Spyfall Now
            </Link>
            <Link
              href="/locations"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              View All Locations
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
