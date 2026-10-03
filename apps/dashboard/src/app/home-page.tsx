import { Bell, CalendarDays, MapPin, Megaphone } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getProductName } from '@/lib/product-name';

const FEATURES = [
  {
    icon: Megaphone,
    title: 'Actualités et agenda',
    text: 'Publiez les informations de la commune dans son application.',
  },
  {
    icon: MapPin,
    title: 'Signalements',
    text: 'Recevez, suivez et traitez les signalements des habitants.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    text: 'Prévenez les habitants concernés, quartier par quartier.',
  },
  {
    icon: CalendarDays,
    title: 'Démarches et collectes',
    text: 'Horaires, démarches en ligne et calendriers de collecte.',
  },
];

/** Accueil public : présentation et accès à la connexion du personnel des communes. */
export function HomePage() {
  const product = getProductName();
  return (
    <main id="contenu" className="mx-auto w-full max-w-4xl flex-1 p-6 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product}</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-lg">
        L’espace de gestion de l’application de votre commune, réservé aux agents et aux élus.
      </p>
      <Button asChild size="lg" className="mt-6 h-11 px-6 text-base">
        <Link href="/connexion">Se connecter</Link>
      </Button>

      <h2 className="sr-only">Fonctionnalités</h2>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-card flex gap-3 rounded-lg border p-4">
            <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-muted-foreground text-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
