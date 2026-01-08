import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-NZBHYKXKY2';
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virtualboardzone.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Virtual Board Zone - Free Online Party Games | Play with Friends',
    template: '%s | Virtual Board Zone',
  },
  description: 'Play free online party games with friends! Spyfall, One Night Werewolf, and more social deduction games. No downloads, no sign-up required. Play instantly in your browser.',
  keywords: [
    'online party games',
    'free online games',
    'play with friends',
    'social deduction games',
    'browser games',
    'multiplayer games',
    'spyfall online',
    'werewolf online',
    'virtual board games',
    'no download games',
    'party games free',
    'online game night',
  ],
  authors: [{ name: 'Virtual Board Zone' }],
  creator: 'Virtual Board Zone',
  publisher: 'Virtual Board Zone',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Virtual Board Zone',
    title: 'Virtual Board Zone - Free Online Party Games',
    description: 'Play free online party games with friends! Spyfall, One Night Werewolf, and more. No downloads required!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Virtual Board Zone - Online Party Games',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virtual Board Zone - Free Online Party Games',
    description: 'Play free party games online with friends! Spyfall, Werewolf & more. No downloads!',
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
  return (
    <html lang="en" className="dark">
      <head>
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
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-800 px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold">Virtual Board Zone</h1>
              <nav className="flex gap-6">
                <a href="#games" className="text-gray-400 hover:text-white transition-colors">
                  Games
                </a>
                <a href="#about" className="text-gray-400 hover:text-white transition-colors">
                  About
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-800 px-6 py-8">
            <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm space-y-3">
              <p>© 2024 Virtual Board Zone. Play games with friends online.</p>
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
      </body>
    </html>
  );
}
