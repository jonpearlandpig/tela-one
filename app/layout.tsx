import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TELA One Alpha',
  description: 'Continuity-first runtime shell',
  manifest: '/manifest.webmanifest'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
