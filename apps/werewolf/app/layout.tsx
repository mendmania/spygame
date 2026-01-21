import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-NZBHYKXKY2';
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://werewolf.virtualboardzone.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'One Night Werewolf Online - Free Multiplayer Party Game | Virtual Board Zone',
    template: '%s | One Night Werewolf - Virtual Board Zone',
  },
  description: 'Play One Night Ultimate Werewolf online for free! A fast-paced social deduction game for 3-10 players. Find the werewolves before they find you. No downloads required!',
  keywords: [
    'one night werewolf',
    'one night ultimate werewolf',
    'werewolf online',
    'play werewolf',
    'free werewolf game',
    'social deduction game',
    'party game online',
    'multiplayer game',
    'browser game',
    'mafia game',
    'virtual board game',
    'online party game',
    'werewolf roles',
  ],
  authors: [{ name: 'Virtual Board Zone' }],
  creator: 'Virtual Board Zone',
  publisher: 'Virtual Board Zone',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Virtual Board Zone',
    title: 'One Night Werewolf Online - Free Multiplayer Party Game',
    description: 'Play One Night Ultimate Werewolf online for free! Fast-paced social deduction for 3-10 players. No downloads - play instantly!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'One Night Werewolf - Social Deduction Party Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'One Night Werewolf Online - Free Multiplayer Party Game',
    description: 'Play One Night Ultimate Werewolf online for free! 3-10 players. No downloads required!',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  category: 'games',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';
  
  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Virtual Board Zone',
    url: hubUrl,
    logo: `${hubUrl}/logo.png`,
    description: 'Free online party games including Spyfall and Werewolf',
    sameAs: [
      // Add your social media links here when available
    ],
  };

  // VideoGame Schema for Werewolf
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication'],
    name: 'One Night Werewolf Online',
    alternateName: ['One Night Ultimate Werewolf', 'Werewolf Game', 'ONUW'],
    description: 'Play One Night Ultimate Werewolf online for free - a fast-paced social deduction game where villagers try to find the werewolves.',
    url: baseUrl,
    image: `${baseUrl}/og-image.png`,
    genre: ['Social Deduction', 'Party Game', 'Hidden Role', 'Strategy', 'Bluffing'],
    keywords: 'werewolf, one night werewolf, one night ultimate werewolf, social deduction, party game, mafia game, multiplayer, free game',
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 3,
      maxValue: 10,
    },
    playMode: ['MultiPlayer', 'CoOp'],
    gamePlatform: ['Web Browser', 'Mobile Web'],
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      availabilityStarts: '2024-01-01',
    },
    author: {
      '@type': 'Organization',
      name: 'Virtual Board Zone',
      url: hubUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Virtual Board Zone',
      url: hubUrl,
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
    gameTip: 'Pay attention during the night phase and remember role wake order to deduce information during the day discussion.',
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Virtual Board Zone',
        item: hubUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Werewolf',
        item: baseUrl,
      },
    ],
  };

  // WebSite Schema for enhanced search
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'One Night Werewolf Online',
    alternateName: 'Virtual Board Zone Werewolf',
    url: baseUrl,
    description: 'Play One Night Ultimate Werewolf online for free - a fast-paced social deduction game',
    publisher: {
      '@type': 'Organization',
      name: 'Virtual Board Zone',
      url: hubUrl,
    },
  };

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#8b5cf6" />
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="game-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }}
        />
        <Script
          id="breadcrumb-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-800 px-6 py-4">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Link href="/" className="text-xl font-bold hover:text-red-400 transition-colors">
                  🐺 WEREWOLF
                </Link>
                <nav className="flex gap-4 md:gap-6 items-center">
                  <Link
                    href="/how-to-play"
                    className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:block"
                  >
                    How to Play
                  </Link>
                  <Link
                    href="/roles"
                    className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:block"
                  >
                    Roles
                  </Link>
                  <a
                    href={process.env.NEXT_PUBLIC_HUB_URL || '/'}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    ← Hub
                  </a>
                </nav>
              </div>
            </header>
            <main className="flex-1 flex flex-col">{children}</main>
            <footer className="border-t border-gray-800 px-6 py-6">
              <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm space-y-2">
                <p>Part of Virtual Board Zone</p>
                <a
                  href="https://buymeacoffee.com/mendmania"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors"
                >
                  ☕ Buy me a coffee
                </a>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
