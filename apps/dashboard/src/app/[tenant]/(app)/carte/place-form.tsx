'use client';

import type { GeoPoint, PlaceInput, PlaceSource, WheelchairAccess } from '@app/shared';
import {
  emptyWeeklyHours,
  openingHoursErrors,
  parseOpeningHours,
  PLACE_SOURCE_LABELS,
  serializeOpeningHours,
  WHEELCHAIR_ACCESS,
  WHEELCHAIR_ACCESS_LABELS,
} from '@app/shared';
import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { reverseGeocodeAction } from '@/app/actions/geocoding';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormField } from '@/components/form-field';
import { AddressSearch } from '@/components/map/address-search';
import { MapView } from '@/components/map/map-view';
import { MediaPicker } from '@/components/media/media-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { removePlaceAction, savePlaceAction } from './actions';
import { OpeningHoursEditor } from '@/components/opening-hours-editor';

type PlaceFormProps = {
  slug: string;
  placeId: string | null;
  initial: PlaceInput;
  categories: { id: string; label: string }[];
  photo: { url: string; altText: string } | null;
  canEdit: boolean;
};

export function PlaceForm({ slug, placeId, initial, categories, photo, canEdit }: PlaceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<PlaceInput>(initial);
  const parsedHours = parseOpeningHours(initial.openingHours);
  const [hours, setHours] = useState(parsedHours ?? emptyWeeklyHours());
  const [rawHours, setRawHours] = useState(parsedHours ? null : initial.openingHours);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState(photo);
  const set = <K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const imported = values.source !== 'manual';

  const movePin = (point: GeoPoint) => {
    set('point', point);
    void reverseGeocodeAction(slug, point).then((r) => {
      if (r) set('address', r.label);
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(openingHoursErrors(hours)).length > 0) {
      setErrors({ openingHours: 'Corrigez les horaires' });
      return;
    }
    const input: PlaceInput = {
      ...values,
      openingHours: rawHours ?? serializeOpeningHours(hours),
      phone: values.phone?.trim() || null,
      website: values.website?.trim() || null,
      description: values.description?.trim() || null,
    };
    startTransition(async () => {
      const result = await savePlaceAction(slug, placeId, input);
      if (result.ok) {
        setErrors({});
        toast.success('Lieu enregistré');
        if (!placeId) router.push(`/${slug}/carte/${result.data.id}`);
        else router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
      }
    });
  };

  const field = (id: string) => ({ error: errors[id] });

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <fieldset disabled={!canEdit || pending} className="space-y-4">
        <p className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
          Source : <strong>{PLACE_SOURCE_LABELS[values.source]}</strong>
        </p>
        {imported ? (
          <div role="note" className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <span>Ce lieu sera écrasé au prochain import sauf si vous le détachez.</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setValues((v) => ({ ...v, source: 'manual' satisfies PlaceSource, externalId: null }))}
            >
              Détacher de l’import
            </Button>
          </div>
        ) : null}
        <FormField id="place-name" label="Nom" required {...field('name')}>
          {(p) => <Input {...p} value={values.name} maxLength={120} onChange={(e) => set('name', e.target.value)} />}
        </FormField>
        <FormField id="place-category" label="Catégorie" required {...field('categoryId')}>
          {(p) => (
            <select {...p} value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Choisir une catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField id="place-address" label="Adresse" required help="Choisissez une adresse proposée pour placer le point ; il reste déplaçable sur la carte." {...field('address')}>
          {(p) => (
            <AddressSearch
              slug={slug}
              id={p.id}
              describedBy={p['aria-describedby']}
              invalid={p['aria-invalid']}
              value={values.address}
              onValueChange={(v) => set('address', v)}
              onSelect={(r) => setValues((v) => ({ ...v, address: r.label, point: r.point }))}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="place-phone" label="Téléphone" {...field('phone')}>
            {(p) => <Input {...p} type="tel" autoComplete="off" value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />}
          </FormField>
          <FormField id="place-website" label="Site web (https)" {...field('website')}>
            {(p) => <Input {...p} type="url" value={values.website ?? ''} onChange={(e) => set('website', e.target.value)} />}
          </FormField>
        </div>
        <FormField id="place-description" label="Description" {...field('description')}>
          {(p) => <Textarea {...p} maxLength={1000} value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} />}
        </FormField>
        {rawHours !== null ? (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <p>
              Horaires importés (format OpenStreetMap) : <code>{rawHours}</code>
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setRawHours(null)}>
              Remplacer par une saisie jour par jour
            </Button>
          </div>
        ) : (
          <OpeningHoursEditor value={hours} onChange={setHours} />
        )}
        {errors.openingHours ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.openingHours}
          </p>
        ) : null}
        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Accessibilité</legend>
          <div className="flex flex-wrap gap-4">
            {WHEELCHAIR_ACCESS.map((w: WheelchairAccess) => (
              <div key={w} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`wc-${w}`}
                  name="wheelchair"
                  className="size-4"
                  checked={values.accessibility.wheelchair === w}
                  onChange={() => set('accessibility', { ...values.accessibility, wheelchair: w })}
                />
                <Label htmlFor={`wc-${w}`} className="font-normal">
                  {WHEELCHAIR_ACCESS_LABELS[w]}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="toilettes"
              type="checkbox"
              className="size-4"
              checked={values.accessibility.toilets}
              onChange={(e) => set('accessibility', { ...values.accessibility, toilets: e.target.checked })}
            />
            <Label htmlFor="toilettes" className="font-normal">
              Toilettes adaptées
            </Label>
          </div>
        </fieldset>
        <MediaPicker
          slug={slug}
          label="Photo du lieu"
          value={values.photoMediaId}
          selected={selectedPhoto}
          onChange={(m) => {
            set('photoMediaId', m?.id ?? null);
            setSelectedPhoto(m ? { url: m.url, altText: m.altText } : null);
          }}
        />
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              Enregistrer le lieu
            </Button>
            {placeId ? (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline">
                    Supprimer
                  </Button>
                }
                title="Supprimer ce lieu ?"
                description="Il disparaîtra de la carte de l’application."
                confirmLabel="Supprimer"
                destructive
                onConfirm={async () => {
                  const r = await removePlaceAction(slug, placeId);
                  if (r.ok) {
                    toast.success('Lieu supprimé');
                    router.push(`/${slug}/carte`);
                  } else toast.error(r.message);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </fieldset>
      <div className="space-y-2">
        <MapView
          center={values.point}
          zoom={15}
          pin={values.point}
          {...(canEdit ? { onPinChange: movePin } : {})}
          ariaLabel="Position du lieu. Cliquez ou déplacez l’épingle pour la modifier ; l’adresse est mise à jour."
          className="h-96 w-full overflow-hidden rounded-md border"
        />
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Position : {values.point.lat.toFixed(5)}, {values.point.lng.toFixed(5)}
        </p>
      </div>
    </form>
  );
}
