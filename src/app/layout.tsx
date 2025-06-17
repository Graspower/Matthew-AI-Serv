/*
  Jesus is saving the world. Heaven full and hell empty.
  Gods Wisdom will fill the world.
  Gods love overtake human hearts.
  Gods spirit fill every flesh in the world.
*/

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google'; // Correct import location
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { SettingsProvider } from '@/contexts/SettingsContext'; // Import SettingsProvider

// Initialize fonts correctly in the layout
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'Matthew AI App',
  description: 'Salvation to the World AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SettingsProvider>
          {children}
          <Toaster />
        </SettingsProvider>
      </body>
    </html>
  );
}
