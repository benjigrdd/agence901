import { PERSONA_KEYS, PERSONAS } from '@app/data';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { connection } from 'next/server';

import { PersonaSwitcher } from '@/components/dev/persona-switcher';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getProductName } from '@/lib/product-name';
import { isMockDataSource } from '@/server/repos';
import { getPersonaKey } from '@/server/session';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const product = getProductName();

export const metadata: Metadata = {
  title: { default: product, template: `%s · ${product}` },
  description: 'Espace de gestion des contenus et services de la commune.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Rendu a la requete : le nonce CSP (proxy) doit etre applique aux scripts de chaque page.
  await connection();
  const mock = isMockDataSource();
  const current = mock ? await getPersonaKey() : null;
  const staffPersonas = PERSONA_KEYS.map((key) => PERSONAS[key])
    .filter((p) => p.kind === 'staff')
    .map(({ key, label, description }) => ({ key, label, description }));

  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          {children}
          {mock ? <PersonaSwitcher personas={staffPersonas} current={current} /> : null}
        </TooltipProvider>
        <Toaster theme="light" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
