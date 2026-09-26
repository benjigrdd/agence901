'use client';

import type { ContentStatus } from '@app/shared';
import { CONTENT_STATUS_LABELS } from '@app/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarOccurrence = {
  key: string;
  eventId: string;
  title: string;
  /** Jour (AAAA-MM-JJ) et heure (« 9 h 00 ») a Paris. */
  day: string;
  time: string | null;
  status: ContentStatus;
};

type MonthCalendarProps = {
  slug: string;
  /** AAAA-MM */
  month: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  today: string;
  occurrences: CalendarOccurrence[];
};

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function buildWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number);
  const year = y ?? 2026;
  const monthIndex = (m ?? 1) - 1;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Calendrier mensuel accessible : grille ARIA, fleches pour changer de jour, Debut/Fin de semaine. */
export function MonthCalendar({ slug, month, monthLabel, prevHref, nextHref, today, occurrences }: MonthCalendarProps) {
  const weeks = buildWeeks(month);
  const days = weeks.flat().filter((d): d is string => d !== null);
  const [focused, setFocused] = useState(days.includes(today) ? today : (days[0] ?? ''));
  const gridRef = useRef<HTMLTableElement>(null);

  const byDay = new Map<string, CalendarOccurrence[]>();
  for (const o of occurrences) byDay.set(o.day, [...(byDay.get(o.day) ?? []), o]);

  const move = (delta: number) => {
    const index = days.indexOf(focused);
    const next = days[Math.min(days.length - 1, Math.max(0, index + delta))];
    if (!next) return;
    setFocused(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const weekday = (days.indexOf(focused) + (weeks[0]?.filter((d) => d === null).length ?? 0)) % 7;
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key] ?? 0);
    } else if (event.key === 'Home') {
      event.preventDefault();
      move(-weekday);
    } else if (event.key === 'End') {
      event.preventDefault();
      move(6 - weekday);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>
            <ChevronLeft aria-hidden="true" />
            Mois précédent
          </Link>
        </Button>
        <h2 className="text-lg font-semibold capitalize" id="calendrier-titre">
          {monthLabel}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>
            Mois suivant
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm" id="calendrier-aide">
        Utilisez les flèches pour changer de jour, Tab pour atteindre les événements du jour.
      </p>
      <div className="overflow-x-auto">
        <table ref={gridRef} role="grid" aria-labelledby="calendrier-titre" aria-describedby="calendrier-aide" className="w-full min-w-[720px] table-fixed border-collapse" onKeyDown={onKeyDown}>
          <thead>
            <tr role="row">
              {WEEKDAYS.map((d) => (
                <th key={d} role="columnheader" scope="col" className="text-muted-foreground p-2 text-left text-xs font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i} role="row">
                {week.map((day, j) => {
                  if (!day) return <td key={j} role="gridcell" className="bg-muted/30 border" />;
                  const items = byDay.get(day) ?? [];
                  const dayNumber = Number(day.slice(8));
                  return (
                    <td
                      key={day}
                      role="gridcell"
                      data-day={day}
                      tabIndex={day === focused ? 0 : -1}
                      aria-current={day === today ? 'date' : undefined}
                      aria-label={`${dayNumber} ${monthLabel}${items.length ? `, ${items.length} événement${items.length > 1 ? 's' : ''}` : ''}`}
                      onFocus={() => setFocused(day)}
                      className={cn('h-28 border p-1 align-top', day === today && 'bg-primary/5')}
                    >
                      <span className={cn('inline-block rounded px-1 text-xs font-semibold', day === today && 'bg-primary text-primary-foreground')} aria-hidden="true">
                        {dayNumber}
                      </span>
                      <ul className="mt-1 space-y-1">
                        {items.map((o) => (
                          <li key={o.key}>
                            <Link
                              href={`/${slug}/agenda/${o.eventId}`}
                              className={cn(
                                'block min-h-6 truncate rounded border px-1 py-0.5 text-xs leading-5',
                                o.status === 'published' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-300 bg-slate-50 text-slate-800',
                              )}
                            >
                              {o.time ? `${o.time} · ` : ''}
                              {o.title}
                              {o.status !== 'published' ? ` (${CONTENT_STATUS_LABELS[o.status]})` : ''}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
