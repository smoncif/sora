import './globals.css';
import 'lib/styles/neoBrutalism.css';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import { Providers } from 'lib/components/layout';

// Neo-Brutalism fonts
const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
});

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

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
      <body className={`${ibmPlexSans.variable} ${jetBrainsMono.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}



