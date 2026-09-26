import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { TooltipProvider } from '@/components/ui/tooltip';
import { getProductName } from '@/lib/product-name';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: getProductName(),
  description: 'Espace de gestion des contenus et services de la commune.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
