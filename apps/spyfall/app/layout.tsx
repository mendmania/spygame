import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-97ZE2FX3BX';

export const metadata: Metadata = {
  title: 'Spyfall - Virtual Board Zone',
  description: 'Find the spy before time runs out! A social deduction game for 4-10 players.',
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
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-800 px-6 py-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Link href="/" className="text-xl font-bold hover:text-blue-400 transition-colors">
                  SPYFALL
                </Link>
                <nav className="flex gap-6">
                  <a
                    href={process.env.NEXT_PUBLIC_HUB_URL || '/'}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    ← Back to Hub
                  </a>
                </nav>
              </div>
            </header>
            <main className="flex-1 flex flex-col">{children}</main>
            <footer className="border-t border-gray-800 px-6 py-6">
              <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
                Part of Virtual Board Zone
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
