'use client';

import type { WeekdayKey, WeeklyHours } from '@app/shared';
import { openingHoursErrors, WEEKDAY_KEYS, WEEKDAY_LABELS_FR } from '@app/shared';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = { value: WeeklyHours; onChange: (value: WeeklyHours) => void };

/** Editeur d'horaires par jour : plages multiples, « Fermé », « 24 h/24 ». */
export function OpeningHoursEditor({ value, onChange }: Props) {
  const errors = openingHoursErrors(value);
  const setDay = (day: WeekdayKey, ranges: WeeklyHours['days'][WeekdayKey]) => onChange({ ...value, days: { ...value.days, [day]: ranges } });

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Horaires d’ouverture</legend>
      <div className="flex items-center gap-2">
        <input id="h-247" type="checkbox" className="size-4" checked={value.alwaysOpen} onChange={(e) => onChange({ ...value, alwaysOpen: e.target.checked })} />
        <Label htmlFor="h-247">Ouvert 24 h/24, 7 j/7</Label>
      </div>
      {value.alwaysOpen
        ? null
        : WEEKDAY_KEYS.map((day) => {
            const ranges = value.days[day];
            const label = WEEKDAY_LABELS_FR[day];
            const error = errors[day];
            return (
              <div key={day} className="grid gap-2 sm:grid-cols-[110px_1fr]" role="group" aria-label={label}>
                <p className="pt-1.5 text-sm font-medium">{label}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id={`h-${day}-ferme`}
                      type="checkbox"
                      className="size-4"
                      checked={ranges.length === 0}
                      onChange={(e) => setDay(day, e.target.checked ? [] : [{ from: '09:00', to: '12:00' }])}
                    />
                    <Label htmlFor={`h-${day}-ferme`} className="font-normal">
                      Fermé
                    </Label>
                  </div>
                  {ranges.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={`h-${day}-${i}-de`} className="font-normal">
                        De
                      </Label>
                      <input
                        id={`h-${day}-${i}-de`}
                        type="time"
                        value={r.from}
                        aria-invalid={error ? true : undefined}
                        onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))}
                        className="border-input h-8 rounded-md border px-2 text-sm"
                      />
                      <Label htmlFor={`h-${day}-${i}-a`} className="font-normal">
                        à
                      </Label>
                      <input
                        id={`h-${day}-${i}-a`}
                        type="time"
                        value={r.to}
                        aria-invalid={error ? true : undefined}
                        onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}
                        className="border-input h-8 rounded-md border px-2 text-sm"
                      />
                      <Button type="button" size="icon" variant="ghost" aria-label={`Supprimer la plage ${i + 1} du ${label.toLowerCase()}`} onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}>
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  {ranges.length > 0 && ranges.length < 4 ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDay(day, [...ranges, { from: '14:00', to: '17:00' }])}>
                      <Plus aria-hidden="true" />
                      Ajouter une plage<span className="sr-only"> le {label.toLowerCase()}</span>
                    </Button>
                  ) : null}
                  {error ? (
                    <p role="alert" className="text-destructive text-sm">
                      {label} : {error}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
    </fieldset>
  );
}
