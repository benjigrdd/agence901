'use client';

import type { AppLinks, HomeLayoutItem } from '@app/shared';
import { HOME_TILE_LABELS } from '@app/shared';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { SortableList } from '@/components/sortable-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { saveAppSettingsAction } from './actions';

type Props = {
  slug: string;
  canEdit: boolean;
  links: AppLinks;
  homeLayout: HomeLayoutItem[];
  branding: { appName: string; primary: string; onPrimary: string; background: string; text: string };
};

const LINK_FIELDS: { key: keyof AppLinks; label: string }[] = [
  { key: 'legalNotice', label: 'Mentions légales' },
  { key: 'privacy', label: 'Politique de confidentialité' },
  { key: 'accessibility', label: 'Déclaration d’accessibilité' },
];

export function AppSettingsForm({ slug, canEdit, links: initialLinks, homeLayout, branding }: Props) {
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<Record<keyof AppLinks, string>>({
    legalNotice: initialLinks.legalNotice ?? '',
    privacy: initialLinks.privacy ?? '',
    accessibility: initialLinks.accessibility ?? '',
  });
  const [layout, setLayout] = useState(homeLayout.map((i) => ({ ...i, id: i.tile })));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveAppSettingsAction(
        slug,
        { legalNotice: links.legalNotice.trim() || null, privacy: links.privacy.trim() || null, accessibility: links.accessibility.trim() || null },
        layout.map(({ tile, enabled }) => ({ tile, enabled })),
      );
      if (r.ok) {
        setErrors({});
        toast.success('Paramètres de l’application enregistrés');
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  const enabledTiles = layout.filter((t) => t.enabled);

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-8">
        <fieldset disabled={!canEdit} className="space-y-3">
          <legend className="text-lg font-semibold">Liens légaux de l’application</legend>
          {LINK_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`lien-${f.key}`}>{f.label} (https)</Label>
              <Input id={`lien-${f.key}`} type="url" value={links[f.key]} aria-invalid={errors[f.key] ? true : undefined} onChange={(e) => setLinks({ ...links, [f.key]: e.target.value })} />
              {errors[f.key] ? <p role="alert" className="text-destructive text-sm">{errors[f.key]}</p> : null}
            </div>
          ))}
        </fieldset>
        <section aria-labelledby="accueil-app" className="space-y-3">
          <h2 id="accueil-app" className="text-lg font-semibold">
            Accueil de l’application
          </h2>
          <p className="text-muted-foreground text-sm">Activez les tuiles et choisissez leur ordre.</p>
          <SortableList
            ariaLabel="Tuiles de l’accueil"
            items={layout}
            disabled={!canEdit}
            label={(t) => HOME_TILE_LABELS[t.tile]}
            onReorder={setLayout}
            render={(t) => (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`tuile-${t.tile}`}
                  className="size-4"
                  disabled={!canEdit}
                  checked={t.enabled}
                  onChange={(e) => setLayout((cur) => cur.map((x) => (x.tile === t.tile ? { ...x, enabled: e.target.checked } : x)))}
                />
                <Label htmlFor={`tuile-${t.tile}`} className="font-normal">
                  {HOME_TILE_LABELS[t.tile]}
                </Label>
              </div>
            )}
          />
        </section>
        {canEdit ? (
          <Button type="submit" disabled={pending}>
            Enregistrer
          </Button>
        ) : null}
      </div>
      <figure className="space-y-2" aria-label="Aperçu de l’accueil de l’application">
        <figcaption className="text-sm font-medium">Aperçu mobile</figcaption>
        <div className="mx-auto w-64 overflow-hidden rounded-[2rem] border-8 border-zinc-900 shadow-lg" style={{ backgroundColor: branding.background, color: branding.text }}>
          <div className="px-4 py-3 text-sm font-semibold" style={{ backgroundColor: branding.primary, color: branding.onPrimary }}>
            {branding.appName}
          </div>
          <ul className="grid grid-cols-2 gap-2 p-3">
            {enabledTiles.map((t) => (
              <li key={t.tile} className="rounded-lg border p-3 text-xs font-medium" style={{ borderColor: branding.primary }}>
                {HOME_TILE_LABELS[t.tile]}
              </li>
            ))}
          </ul>
        </div>
      </figure>
    </form>
  );
}
