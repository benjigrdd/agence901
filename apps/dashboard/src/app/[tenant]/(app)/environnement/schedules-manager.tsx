'use client';

import type { WasteException, WasteType } from '@app/shared';
import { WASTE_TYPE_LABELS, WASTE_TYPES, weeklyCollectionRule } from '@app/shared';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { removeScheduleAction, saveScheduleAction } from './actions';

type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'MO', label: 'Lundi' },
  { key: 'TU', label: 'Mardi' },
  { key: 'WE', label: 'Mercredi' },
  { key: 'TH', label: 'Jeudi' },
  { key: 'FR', label: 'Vendredi' },
  { key: 'SA', label: 'Samedi' },
];

type ScheduleView = { id: string; zoneId: string; wasteType: WasteType; rrule: string; exceptions: WasteException[]; note: string | null };
type Props = {
  slug: string;
  canEdit: boolean;
  zones: { id: string; name: string }[];
  schedules: ScheduleView[];
  previews: { zoneId: string; next: { key: string; label: string }[] }[];
};
type Draft = { id: string | null; zoneId: string; wasteType: WasteType; weekday: Weekday; interval: 1 | 2; start: string; exceptions: WasteException[]; note: string };

/** Relit une RRULE produite par `weeklyCollectionRule`. */
function readRule(rrule: string): { weekday: Weekday; interval: 1 | 2; start: string } {
  const day = /BYDAY=([A-Z]{2})/.exec(rrule)?.[1];
  const start = /DTSTART:(\d{4})(\d{2})(\d{2})/.exec(rrule);
  return {
    weekday: WEEKDAYS.find((w) => w.key === day)?.key ?? 'MO',
    interval: /INTERVAL=2/.test(rrule) ? 2 : 1,
    start: start ? `${start[1]}-${start[2]}-${start[3]}` : new Date().toISOString().slice(0, 10),
  };
}

function describe(s: ScheduleView): string {
  const r = readRule(s.rrule);
  const day = WEEKDAYS.find((w) => w.key === r.weekday)?.label.toLowerCase() ?? '';
  return `${r.interval === 2 ? 'Un' : 'Chaque'} ${day}${r.interval === 2 ? ' sur deux' : ''}`;
}

export function SchedulesManager({ slug, canEdit, zones, schedules, previews }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const edit = (s: ScheduleView) => {
    const r = readRule(s.rrule);
    setErrors({});
    setDraft({ id: s.id, zoneId: s.zoneId, wasteType: s.wasteType, ...r, exceptions: s.exceptions, note: s.note ?? '' });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const input = {
      zoneId: draft.zoneId,
      wasteType: draft.wasteType,
      rrule: weeklyCollectionRule(draft.start, draft.weekday, draft.interval),
      exceptions: draft.exceptions.filter((x) => x.date),
      note: draft.note.trim() || null,
    };
    startTransition(async () => {
      const r = await saveScheduleAction(slug, draft.id, input);
      if (r.ok) {
        toast.success('Calendrier enregistré');
        setDraft(null);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  const setException = (i: number, patch: Partial<WasteException>) =>
    setDraft((d) => (d ? { ...d, exceptions: d.exceptions.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : d));

  return (
    <div className="space-y-6">
      {canEdit && zones[0] ? (
        <Button
          onClick={() =>
            setDraft({ id: null, zoneId: zones[0]?.id ?? '', wasteType: 'household', weekday: 'MO', interval: 1, start: new Date().toISOString().slice(0, 10), exceptions: [], note: '' })
          }
        >
          <Plus aria-hidden="true" />
          Nouvelle collecte
        </Button>
      ) : null}

      {draft ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" aria-labelledby="collecte-edition">
          <h2 id="collecte-edition" className="font-semibold">
            {draft.id ? 'Modifier la collecte' : 'Nouvelle collecte'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="c-zone">Zone</Label>
              <select id="c-zone" value={draft.zoneId} onChange={(e) => setDraft({ ...draft, zoneId: e.target.value })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-type">Type de déchet</Label>
              <select id="c-type" value={draft.wasteType} onChange={(e) => setDraft({ ...draft, wasteType: WASTE_TYPES.find((w) => w === e.target.value) ?? 'household' })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                {WASTE_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {WASTE_TYPE_LABELS[w]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-jour">Jour</Label>
              <select id="c-jour" value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: WEEKDAYS.find((w) => w.key === e.target.value)?.key ?? 'MO' })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                {WEEKDAYS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-frequence">Fréquence</Label>
              <select id="c-frequence" value={draft.interval} onChange={(e) => setDraft({ ...draft, interval: e.target.value === '2' ? 2 : 1 })} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                <option value="1">Chaque semaine</option>
                <option value="2">Toutes les 2 semaines</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-debut">À partir du</Label>
              <Input id="c-debut" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
          </div>

          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Exceptions (jours fériés…)</legend>
            {draft.exceptions.map((x, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`ex-${i}-date`}>Collecte du</Label>
                  <Input id={`ex-${i}-date`} type="date" value={x.date} onChange={(e) => setException(i, { date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`ex-${i}-report`}>Reportée au (vide = annulée)</Label>
                  <Input id={`ex-${i}-report`} type="date" value={x.movedTo ?? ''} onChange={(e) => setException(i, { movedTo: e.target.value || null })} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer l’exception ${i + 1}`} onClick={() => setDraft({ ...draft, exceptions: draft.exceptions.filter((_, j) => j !== i) })}>
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...draft, exceptions: [...draft.exceptions, { date: '', movedTo: null }] })}>
              <Plus aria-hidden="true" />
              Ajouter une exception
            </Button>
            {errors.exceptions ? <p role="alert" className="text-destructive text-sm">{errors.exceptions}</p> : null}
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="c-note">Note (facultatif)</Label>
            <Input id="c-note" value={draft.note} maxLength={200} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              Enregistrer la collecte
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {zones.map((z) => {
          const zoneSchedules = schedules.filter((s) => s.zoneId === z.id);
          const preview = previews.find((p) => p.zoneId === z.id)?.next ?? [];
          return (
            <section key={z.id} aria-labelledby={`zone-${z.id}`} className="space-y-3 rounded-lg border p-4">
              <h2 id={`zone-${z.id}`} className="font-semibold">
                {z.name}
              </h2>
              <ul className="space-y-1 text-sm">
                {zoneSchedules.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{WASTE_TYPE_LABELS[s.wasteType]}</strong> : {describe(s)}
                      {s.exceptions.length ? ` · ${s.exceptions.length} exception${s.exceptions.length > 1 ? 's' : ''}` : ''}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                    {canEdit ? (
                      <span className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => edit(s)}>
                          Modifier<span className="sr-only"> la collecte {WASTE_TYPE_LABELS[s.wasteType]} de {z.name}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await removeScheduleAction(slug, s.id);
                              if (r.ok) router.refresh();
                              else toast.error(r.message);
                            })
                          }
                        >
                          Supprimer<span className="sr-only"> la collecte {WASTE_TYPE_LABELS[s.wasteType]} de {z.name}</span>
                        </Button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <h3 className="text-sm font-medium">8 prochaines collectes</h3>
              <ol className="text-muted-foreground list-inside list-decimal text-sm" data-testid={`prochaines-${z.name}`}>
                {preview.map((p) => (
                  <li key={p.key} className="first-letter:uppercase">
                    {p.label}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
