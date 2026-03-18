import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DevBrain SaaS',
  description: 'AI that learns YOUR coding style and improves every project'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
