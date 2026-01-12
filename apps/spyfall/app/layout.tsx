import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-NZBHYKXKY2';
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spyfall.virtualboardzone.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Spyfall Online - Free Multiplayer Social Deduction Game | Virtual Board Zone',
    template: '%s | Spyfall - Virtual Board Zone',
  },
  description: 'Play Spyfall online for free! Find the spy before time runs out in this thrilling social deduction party game for 4-10 players. No downloads required - play instantly in your browser.',
  keywords: [
    'spyfall',
    'spyfall online',
    'play spyfall',
    'free spyfall',
    'social deduction game',
    'party game online',
    'multiplayer game',
    'browser game',
    'find the spy',
    'secret location game',
    'virtual board game',
    'online party game',
  ],
  authors: [{ name: 'Virtual Board Zone' }],
  creator: 'Virtual Board Zone',
  publisher: 'Virtual Board Zone',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Virtual Board Zone',
    title: 'Spyfall Online - Free Multiplayer Social Deduction Game',
    description: 'Play Spyfall online for free! Find the spy before time runs out. A thrilling party game for 4-10 players. No downloads - play instantly!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Spyfall - Social Deduction Party Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spyfall Online - Free Multiplayer Social Deduction Game',
    description: 'Play Spyfall online for free! Find the spy before time runs out. 4-10 players. No downloads required!',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';
  
  // VideoGame Schema for Spyfall
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Spyfall Online',
    description: 'Play Spyfall online for free - a thrilling social deduction party game where players try to find the spy among them.',
    url: baseUrl,
    genre: ['Social Deduction', 'Party Game', 'Deduction'],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 4,
      maxValue: 10,
    },
    playMode: ['MultiPlayer'],
    gamePlatform: ['Web Browser'],
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    author: {
      '@type': 'Organization',
      name: 'Virtual Board Zone',
      url: hubUrl,
    },
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
        name: 'Spyfall',
        item: baseUrl,
      },
    ],
  };

  return (
    <html lang="en" className="dark">
      <head>
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
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Link href="/" className="text-xl font-bold hover:text-blue-400 transition-colors">
                  SPYFALL
                </Link>
                <nav className="flex gap-4 md:gap-6 items-center">
                  <Link
                    href="/how-to-play"
                    className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:block"
                  >
                    How to Play
                  </Link>
                  <Link
                    href="/locations"
                    className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:block"
                  >
                    Locations
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
              <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm space-y-2">
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
