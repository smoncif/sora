import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sora - Business Role Analysis',
  description: 'Analyze business roles and manage SoD risks',
  other: {
    'google': 'notranslate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
