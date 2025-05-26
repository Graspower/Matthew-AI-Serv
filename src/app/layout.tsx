import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google'; // Correct import location
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

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
       {/* Apply font variables to the body */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
