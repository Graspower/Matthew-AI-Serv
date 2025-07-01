
/*
  Jesus is saving the world. Heaven full and hell empty.
  Gods Wisdom will fill us.
  Gods love overtake human hearts.
  Gods spirit fill every flesh in the world.
*/

import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google'; // Correct import location
import { Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { SettingsProvider } from '@/contexts/SettingsContext'; // Import SettingsProvider
import { ThemeProvider } from '@/contexts/ThemeContext'; // Import ThemeProvider
import Script from 'next/script';

// Initialize fonts correctly in the layout
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'Matthew AI App',
  description: 'Salvation to the World AI',
  manifest: '/manifest.json', // Link to the manifest file
  icons: { // It's good practice to also define icons here for SEO and various platforms
    icon: [
      { url: '/images/Jesussavesicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/Jesussavesicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/images/Jesussavesicon.png', // For Apple touch icon
  },
};

export const viewport: Viewport = {
  themeColor: '#1043E0', // Matches theme_color in manifest.json
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Matthew AI App" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MatthewAI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1043E0" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="matthew-ai-theme"
        >
          <SettingsProvider>
            {children}
            <Toaster />
          </SettingsProvider>
        </ThemeProvider>
        <Script id="sw-registration" strategy="lazyOnload">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  })
                  .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
