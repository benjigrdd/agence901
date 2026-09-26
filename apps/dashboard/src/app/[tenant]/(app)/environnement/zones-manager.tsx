'use client';

import type { GeoMultiPolygon, GeoPoint } from '@app/shared';
import { Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent, FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DrawMap } from '@/components/map/draw-map';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePolygonGeoJson } from '@/lib/geojson';

import { removeZoneAction, saveZoneAction } from './actions';

type ZoneView = { id: string; name: string; geom: GeoMultiPolygon };
type Draft = { id: string | null; name: string; geom: GeoMultiPolygon | null; version: number };

const ZONE_COLOR = '#4d7c0f';

export function ZonesManager({ slug, center, canEdit, zones }: { slug: string; center: GeoPoint; canEdit: boolean; zones: ZoneView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;
    const result = parsePolygonGeoJson(await file.text());
    if (!result.ok) return setErrors({ geom: result.message });
    setErrors({});
    setDraft({ ...draft, geom: result.geom, version: Date.now() });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.geom) return setErrors({ geom: 'Dessinez ou importez au moins un polygone' });
    const input = { name: draft.name.trim(), geom: draft.geom };
    startTransition(async () => {
      const r = await saveZoneAction(slug, draft.id, input);
      if (r.ok) {
        toast.success('Zone enregistrée');
        setDraft(null);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {zones.length} zone{zones.length > 1 ? 's' : ''} de collecte
        </h2>
        {canEdit ? (
          <Button onClick={() => setDraft({ id: null, name: '', geom: null, version: Date.now() })}>
            <Plus aria-hidden="true" />
            Nouvelle zone
          </Button>
        ) : null}
      </div>
      <ul className="divide-y rounded-lg border">
        {zones.map((z) => (
          <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span>
              {z.name} · {z.geom.coordinates.length} polygone{z.geom.coordinates.length > 1 ? 's' : ''}
            </span>
            {canEdit ? (
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ id: z.id, name: z.name, geom: z.geom, version: Date.now() })}>
                  <Pencil aria-hidden="true" />
                  Modifier<span className="sr-only"> {z.name}</span>
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost">
                      Supprimer<span className="sr-only"> {z.name}</span>
                    </Button>
                  }
                  title={`Supprimer la zone « ${z.name} » ?`}
                  description="Les calendriers de cette zone ne seront plus proposés aux habitants."
                  confirmLabel="Supprimer"
                  destructive
                  onConfirm={async () => {
                    const r = await removeZoneAction(slug, z.id);
                    if (r.ok) {
                      toast.success('Zone supprimée');
                      router.refresh();
                    } else toast.error(r.message);
                  }}
                />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {draft ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" aria-labelledby="zone-edition">
          <h3 id="zone-edition" className="font-semibold">
            {draft.id ? `Modifier « ${draft.name} »` : 'Nouvelle zone'}
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="zone-nom">Nom</Label>
              <Input id="zone-nom" value={draft.name} maxLength={60} className="w-64" aria-invalid={errors.name ? true : undefined} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              {errors.name ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="zone-import">Importer un GeoJSON</Label>
              <input id="zone-import" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={importFile} className="block text-sm" />
            </div>
          </div>
          <DrawMap
            key={draft.version}
            center={center}
            color={ZONE_COLOR}
            value={draft.geom}
            onChange={(geom) => setDraft((d) => (d ? { ...d, geom } : d))}
            background={zones.filter((z) => z.id !== draft.id).map((z) => ({ ...z, color: '#64748b' }))}
            ariaLabel="Carte de dessin de la zone de collecte"
          />
          {errors.geom ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.geom}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              Enregistrer la zone
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Fermer
            </Button>
          </div>
        </form>
      ) : (
        <MapView
          center={center}
          ariaLabel="Carte des zones de collecte. La liste ci-dessus présente les mêmes zones."
          polygons={zones.map((z) => ({ id: z.id, geom: z.geom, color: ZONE_COLOR, label: z.name }))}
          className="h-96 w-full overflow-hidden rounded-md border"
        />
      )}
    </div>
  );
}
