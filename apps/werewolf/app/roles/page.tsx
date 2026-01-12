import { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, WebPageSchema } from '@vbz/ui';
import { ROLE_CONFIGS, getRoleEmoji } from '../../constants/roles';
import type { WerewolfRole } from '@vbz/shared-types';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://werewolf.virtualboardzone.com';
const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';

export const metadata: Metadata = {
  title: 'One Night Werewolf Roles Guide - All Roles Explained',
  description: 'Complete guide to all One Night Ultimate Werewolf roles. Learn about Werewolf, Seer, Robber, Troublemaker, Minion, Mason, Drunk, Insomniac, and more!',
  keywords: [
    'werewolf roles',
    'one night werewolf roles',
    'werewolf seer',
    'werewolf robber',
    'werewolf troublemaker',
    'one night ultimate werewolf characters',
    'werewolf minion',
    'werewolf game roles list',
    'werewolf role abilities',
  ],
  openGraph: {
    title: 'One Night Werewolf Roles - Complete Guide to All Characters',
    description: 'Master every role in One Night Ultimate Werewolf. Detailed guides for all roles and their abilities!',
    url: `${baseUrl}/roles`,
    type: 'article',
  },
  alternates: {
    canonical: `${baseUrl}/roles`,
  },
};

// Organize roles by team
const rolesByTeam = {
  werewolf: ['werewolf', 'minion'] as WerewolfRole[],
  village: ['seer', 'robber', 'troublemaker', 'mason', 'insomniac', 'villager'] as WerewolfRole[],
  neutral: ['drunk', 'witch'] as WerewolfRole[],
};

const teamInfo = {
  werewolf: {
    name: 'Werewolf Team',
    description: 'Win if no werewolves are killed in the final vote',
    color: 'red',
    emoji: '🐺',
  },
  village: {
    name: 'Village Team',
    description: 'Win if at least one werewolf is killed',
    color: 'blue',
    emoji: '🏘️',
  },
  neutral: {
    name: 'Neutral / Variable',
    description: 'Win conditions may change based on circumstances',
    color: 'yellow',
    emoji: '⚖️',
  },
};

export default function RolesPage() {
  const allRoles = Object.entries(ROLE_CONFIGS) as [WerewolfRole, typeof ROLE_CONFIGS[WerewolfRole]][];
  
  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbSchema
        items={[
          { name: 'Virtual Board Zone', url: hubUrl },
          { name: 'Werewolf', url: baseUrl },
          { name: 'Roles', url: `${baseUrl}/roles` },
        ]}
      />
      <WebPageSchema
        name="One Night Werewolf Roles - Complete Character Guide"
        description="Complete guide to all One Night Ultimate Werewolf roles and their special abilities."
        url={`${baseUrl}/roles`}
        author={{ name: 'Virtual Board Zone', url: hubUrl }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12">
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
            <li className="text-gray-400">Roles</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Werewolf Roles Guide
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Master every role in One Night Ultimate Werewolf. 
            Learn their abilities, strategies, and how to play them effectively.
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{allRoles.length}</div>
            <div className="text-sm text-gray-400">Total Roles</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">
              {allRoles.filter(([_, config]) => config.team === 'village').length}
            </div>
            <div className="text-sm text-gray-400">Village Roles</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-500">
              {allRoles.filter(([_, config]) => config.team === 'werewolf').length}
            </div>
            <div className="text-sm text-gray-400">Werewolf Team</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {allRoles.filter(([_, config]) => config.nightAction).length}
            </div>
            <div className="text-sm text-gray-400">Night Actions</div>
          </div>
        </div>

        {/* Play CTA */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-xl p-6 mb-12 text-center">
          <p className="text-lg mb-4">Ready to test these roles in action?</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Play Werewolf Free
          </Link>
        </div>

        {/* Roles by Team */}
        {Object.entries(teamInfo).map(([team, info]) => {
          const teamRoles = allRoles.filter(([_, config]) => config.team === team);
          if (teamRoles.length === 0) return null;

          const borderColor = team === 'werewolf' ? 'border-red-700' : team === 'village' ? 'border-blue-700' : 'border-yellow-700';
          const bgColor = team === 'werewolf' ? 'bg-red-900/20' : team === 'village' ? 'bg-blue-900/20' : 'bg-yellow-900/20';
          const textColor = team === 'werewolf' ? 'text-red-400' : team === 'village' ? 'text-blue-400' : 'text-yellow-400';

          return (
            <section key={team} className="mb-12">
              <div className={`${bgColor} border ${borderColor} rounded-xl p-6 mb-6`}>
                <h2 className={`text-2xl font-bold ${textColor} mb-2`}>
                  {info.emoji} {info.name}
                </h2>
                <p className="text-gray-400">{info.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {teamRoles.map(([roleId, config]) => (
                  <article
                    key={roleId}
                    className={`bg-gray-800/50 rounded-xl p-6 border ${borderColor}/50`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{getRoleEmoji(roleId)}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{config.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`text-xs px-2 py-1 rounded ${bgColor} ${textColor}`}>
                            {info.name}
                          </span>
                          {config.nightAction && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-900/30 text-purple-400">
                              🌙 Night Action
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 mb-4">{config.description}</p>
                        
                        {/* Strategy Tips */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold mb-2 text-gray-300">💡 Strategy Tips</h4>
                          <p className="text-sm text-gray-400">
                            {getRoleStrategy(roleId)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {/* Night Action Order */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Night Action Order</h2>
          <p className="text-gray-400 mb-4">
            During the night phase, roles with night actions wake up in this specific order:
          </p>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <ol className="space-y-3">
              {allRoles
                .filter(([_, config]) => config.nightAction && config.nightOrderIndex !== undefined)
                .sort((a, b) => (a[1].nightOrderIndex ?? 999) - (b[1].nightOrderIndex ?? 999))
                .map(([roleId, config], index) => (
                  <li key={roleId} className="flex items-center gap-4">
                    <span className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-2xl">{getRoleEmoji(roleId)}</span>
                    <div>
                      <span className="font-semibold">{config.name}</span>
                      <span className="text-gray-500 text-sm ml-2">- {config.description}</span>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </section>

        {/* Tips for Role Selection */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Role Selection Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-green-400">✅ Recommended Combinations</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Always include at least 1 Werewolf</li>
                <li>• Seer + Robber creates great deduction</li>
                <li>• Masons work well with 6+ players</li>
                <li>• Insomniac helps validate claims</li>
                <li>• Troublemaker adds chaos and fun</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-red-400">⚠️ Things to Consider</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• More special roles = more chaos</li>
                <li>• Minion needs werewolves to be useful</li>
                <li>• Too many Villagers can be boring</li>
                <li>• Drunk + Troublemaker = maximum confusion</li>
                <li>• New players? Start with basic roles</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
          <p className="text-gray-400 mb-6">
            Now that you know all the roles, gather your friends and start hunting werewolves!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Play Werewolf Now
            </Link>
            <Link
              href="/how-to-play"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              Learn How to Play
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

// Helper function for role-specific strategy tips
function getRoleStrategy(role: WerewolfRole): string {
  const strategies: Record<WerewolfRole, string> = {
    werewolf: 'Claim a village role early and confidently. Support other players to seem helpful. If caught, claim you were robbed or switched!',
    minion: 'Protect the werewolves at all costs - even by getting yourself killed. Claim to be the Seer and "see" a villager as the werewolf.',
    seer: 'Reveal your information early to help the village. Check the center if you suspect all werewolves are there.',
    robber: 'If you rob a werewolf, you become one! Reveal what you stole to help (or misdirect) the village.',
    troublemaker: 'Remember who you switched - this info is gold during discussion. You can clear two players of being original werewolves.',
    mason: 'Confirm each other early to establish trust. This helps narrow down who could be werewolves.',
    drunk: 'You don\'t know your final role! Watch discussions carefully for clues about what you might have become.',
    insomniac: 'Your info is crucial - you know your final role. Share it to validate or contradict other claims.',
    villager: 'Pay attention and ask good questions. Your vote matters - make sure the village gets it right!',
    witch: 'Use your power wisely. Looking at a center card can reveal if werewolves are in play or not.',
  };
  return strategies[role] || 'Play your role to the best of your ability!';
}
