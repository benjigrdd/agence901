'use client';

import type { GeoMultiPolygon, GeoPoint } from '@app/shared';
import { GeoPolygonalSchema, toMultiPolygon } from '@app/shared';
import { Pencil, Plus, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent, FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DrawMap } from '@/components/map/draw-map';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { removeDistrictAction, saveDistrictAction } from './actions';

type DistrictView = { id: string; name: string; color: string; geom: GeoMultiPolygon; reports: number; subscribers: number };

type Props = { slug: string; center: GeoPoint; canEdit: boolean; districts: DistrictView[] };

const GeoJsonInputSchema = z.union([
  GeoPolygonalSchema,
  z.object({ type: z.literal('Feature'), geometry: GeoPolygonalSchema }),
  z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({ geometry: GeoPolygonalSchema })).min(1) }),
]);

/** Lit un GeoJSON (geometrie, Feature ou FeatureCollection) Polygon/MultiPolygon en WGS84. */
export function parseDistrictGeoJson(text: string): { ok: true; geom: GeoMultiPolygon } | { ok: false; message: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Fichier illisible : JSON invalide.' };
  }
  const parsed = GeoJsonInputSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: 'GeoJSON non reconnu : un Polygon ou MultiPolygon en WGS84 (longitude, latitude) est attendu.' };
  }
  const data = parsed.data;
  if (data.type === 'Feature') return { ok: true, geom: toMultiPolygon(data.geometry) };
  if (data.type === 'FeatureCollection') {
    return { ok: true, geom: { type: 'MultiPolygon', coordinates: data.features.flatMap((f) => toMultiPolygon(f.geometry).coordinates) } };
  }
  return { ok: true, geom: toMultiPolygon(data) };
}

type Draft = { id: string | null; name: string; color: string; geom: GeoMultiPolygon | null; version: number };

export function DistrictsManager({ slug, center, canEdit, districts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overlaps, setOverlaps] = useState<string[]>([]);

  const open = (d: DistrictView | null) => {
    setErrors({});
    setOverlaps([]);
    setDraft(d ? { id: d.id, name: d.name, color: d.color, geom: d.geom, version: Date.now() } : { id: null, name: '', color: '#7c3aed', geom: null, version: Date.now() });
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;
    const result = parseDistrictGeoJson(await file.text());
    if (!result.ok) {
      setErrors({ geom: result.message });
      return;
    }
    setErrors({});
    setDraft({ ...draft, geom: result.geom, version: Date.now() });
    toast.success('Contour importé');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.geom) {
      setErrors({ geom: 'Dessinez ou importez au moins un polygone' });
      return;
    }
    const input = { name: draft.name.trim(), color: draft.color, geom: draft.geom };
    startTransition(async () => {
      const r = await saveDistrictAction(slug, draft.id, input);
      if (r.ok) {
        setErrors({});
        setOverlaps(r.data.overlaps);
        toast.success('Quartier enregistré');
        setDraft((d) => (d ? { ...d, id: r.data.id } : d));
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="liste-quartiers" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="liste-quartiers" className="text-lg font-semibold">
            {districts.length} quartier{districts.length > 1 ? 's' : ''}
          </h2>
          {canEdit ? (
            <Button onClick={() => open(null)}>
              <Plus aria-hidden="true" />
              Nouveau quartier
            </Button>
          ) : null}
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Quartiers, avec le nombre de signalements et d’habitants abonnés</caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2">
                Quartier
              </th>
              <th scope="col">Signalements</th>
              <th scope="col">Habitants abonnés</th>
              {canEdit ? (
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-sm border" style={{ backgroundColor: d.color }} aria-hidden="true" />
                    {d.name}
                  </span>
                </td>
                <td>{d.reports}</td>
                <td>{d.subscribers}</td>
                {canEdit ? (
                  <td className="space-x-1 text-right">
                    <Button size="sm" variant="ghost" onClick={() => open(d)}>
                      <Pencil aria-hidden="true" />
                      Modifier<span className="sr-only"> {d.name}</span>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          Supprimer<span className="sr-only"> {d.name}</span>
                        </Button>
                      }
                      title={`Supprimer le quartier « ${d.name} » ?`}
                      description="Il ne sera plus proposé pour le ciblage des actualités et des notifications."
                      confirmLabel="Supprimer"
                      destructive
                      onConfirm={async () => {
                        const r = await removeDistrictAction(slug, d.id);
                        if (r.ok) {
                          toast.success('Quartier supprimé');
                          if (draft?.id === d.id) setDraft(null);
                          router.refresh();
                        } else toast.error(r.message);
                      }}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {draft ? (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg border p-4" aria-labelledby="edition-quartier">
          <h2 id="edition-quartier" className="text-lg font-semibold">
            {draft.id ? `Modifier « ${draft.name} »` : 'Nouveau quartier'}
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="q-nom">Nom</Label>
              <Input
                id="q-nom"
                value={draft.name}
                maxLength={60}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'q-nom-erreur' : undefined}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-64"
              />
              {errors.name ? (
                <p id="q-nom-erreur" role="alert" className="text-destructive text-sm">
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-couleur">Couleur</Label>
              <input id="q-couleur" type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="block h-9 w-14 rounded border" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-import">Importer un GeoJSON</Label>
              <input id="q-import" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={importFile} className="block text-sm" aria-describedby="q-import-aide" />
              <p id="q-import-aide" className="text-muted-foreground text-xs">
                Polygon ou MultiPolygon en WGS84.
              </p>
            </div>
          </div>
          <DrawMap
            key={draft.version}
            center={center}
            color={draft.color}
            value={draft.geom}
            onChange={(geom) => setDraft((d) => (d ? { ...d, geom } : d))}
            background={districts.filter((d) => d.id !== draft.id)}
            ariaLabel="Carte de dessin du quartier. Les autres quartiers sont affichés en pointillés."
          />
          <p className="text-sm" aria-live="polite">
            {draft.geom ? `${draft.geom.coordinates.length} polygone${draft.geom.coordinates.length > 1 ? 's' : ''} dessiné${draft.geom.coordinates.length > 1 ? 's' : ''}` : 'Aucun polygone'}
          </p>
          {errors.geom ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.geom}
            </p>
          ) : null}
          {overlaps.length ? (
            <p role="status" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert className="size-4" aria-hidden="true" />
              Attention : ce quartier chevauche {overlaps.join(', ')}.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              Enregistrer le quartier
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Fermer
            </Button>
          </div>
        </form>
      ) : (
        <section aria-labelledby="apercu-quartiers" className="space-y-2">
          <h2 id="apercu-quartiers" className="text-lg font-semibold">
            Aperçu
          </h2>
          <MapView
            center={center}
            ariaLabel="Carte des quartiers. Le tableau ci-dessus présente la même liste."
            polygons={districts.map((d) => ({ id: d.id, geom: d.geom, color: d.color, label: d.name }))}
            className="h-[420px] w-full overflow-hidden rounded-md border"
          />
        </section>
      )}
    </div>
  );
}
