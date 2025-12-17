import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-NZBHYKXKY2';

export const metadata: Metadata = {
  title: 'Virtual Board Zone - Online Party Games',
  description: 'Play Spyfall, Codenames, and more with friends online. No downloads required.',
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
