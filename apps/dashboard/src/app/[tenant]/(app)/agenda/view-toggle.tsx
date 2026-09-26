'use client';

import { CalendarDays, List } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const AGENDA_VIEW_COOKIE = 'agenda_vue';

/** Bascule Liste / Calendrier, memorisee dans un cookie. */
export function ViewToggle({ current, listHref, calendarHref }: { current: 'liste' | 'calendrier'; listHref: string; calendarHref: string }) {
  const remember = (view: string) => {
    document.cookie = `${AGENDA_VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <div role="group" aria-label="Affichage de l’agenda" className="flex gap-1">
      <Button asChild size="sm" variant={current === 'liste' ? 'secondary' : 'ghost'}>
        <Link href={listHref} aria-current={current === 'liste' ? 'page' : undefined} onClick={() => remember('liste')}>
          <List aria-hidden="true" />
          Liste
        </Link>
      </Button>
      <Button asChild size="sm" variant={current === 'calendrier' ? 'secondary' : 'ghost'}>
        <Link href={calendarHref} aria-current={current === 'calendrier' ? 'page' : undefined} onClick={() => remember('calendrier')}>
          <CalendarDays aria-hidden="true" />
          Calendrier
        </Link>
      </Button>
    </div>
  );
}
