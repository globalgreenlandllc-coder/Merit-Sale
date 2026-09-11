import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-fraunces',
  display: 'swap',
});
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Earn the Keys', template: '%s — Earn the Keys' },
  description: 'A merit sale is a way of selling a home where the buyer is chosen by objective skill instead of by price or by luck. One registration. One test. The highest score takes the keys.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = { themeColor: '#0f1613', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
