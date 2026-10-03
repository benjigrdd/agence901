import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { getProductName } from '@/lib/product-name';

type AuthShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** `wide` : contenu plus large (choix de persona en démonstration, QR code de la 2FA). */
  size?: 'default' | 'wide';
  /** Lien sous la carte (retour à la connexion, à l'accueil…). */
  footer?: ReactNode;
};

/** Cadre commun des pages d'authentification : centré, logo et nom du produit, carte. */
export function AuthShell({
  title,
  description,
  children,
  size = 'default',
  footer,
}: AuthShellProps) {
  const product = getProductName();
  return (
    <main
      id="contenu"
      className="bg-muted/40 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16"
    >
      <div className={cn('w-full', size === 'wide' ? 'max-w-3xl' : 'max-w-md')}>
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-lg text-lg font-extrabold tracking-tight"
        >
          <span
            className="flex size-9 items-center justify-center rounded-[10px] bg-neutral-950"
            aria-hidden="true"
          >
            <Image src="/logo-blanc.svg" alt="" width={22} height={21} unoptimized />
          </span>
          {product}
        </Link>
        <div className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <div className="text-muted-foreground mt-2">{description}</div> : null}
          {children}
        </div>
        {footer ? (
          <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
