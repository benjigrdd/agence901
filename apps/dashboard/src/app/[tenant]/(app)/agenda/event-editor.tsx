'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { BrandingColors, ContentStatus, EventInput, GeoPoint, RecurrenceFrequency } from '@app/shared';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EventInputSchema,
  formatDateFr,
  formatDateTimeLongFr,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  recurrenceToRRule,
  rruleToRecurrence,
} from '@app/shared';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { TransitionRequest } from '@/components/content/content-actions';
import { ContentActions } from '@/components/content/content-actions';
import type { ReviewView } from '@/components/content/review-history';
import { ReviewHistory } from '@/components/content/review-history';
import { DateTimeField } from '@/components/date-time-field';
import { FormErrorSummary } from '@/components/form-error-summary';
import { FormField } from '@/components/form-field';
import { MapView } from '@/components/map/map-view';
import { MediaPicker } from '@/components/media/media-picker';
import { MobilePreview } from '@/components/mobile-preview';
import { RichTextEditor } from '@/components/rich-text-editor';
import { StatusBadge } from '@/components/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { saveEventAction, transitionEventAction } from './actions';

const FIELD_LABELS: Partial<Record<keyof EventInput, string>> = {
  title: 'Titre',
  category: 'Catégorie',
  startsAt: 'Début',
  endsAt: 'Fin',
  location: 'Lieu',
  price: 'Tarif',
  registrationUrl: 'Lien d’inscription',
  publishAt: 'Date de publication',
};

const fieldId = (name: string) => `event-${name}`;
const nullIfEmpty = (v: string | null) => (v && v.trim() ? v.trim() : null);

type EventEditorProps = {
  slug: string;
  eventId: string | null;
  initial: EventInput;
  status: ContentStatus | null;
  canEdit: boolean;
  allowed: ContentStatus[];
  reviews: ReviewView[];
  places: { id: string; name: string }[];
  center: GeoPoint;
  branding: { appName: string; colors: BrandingColors };
  cover: { url: string; altText: string } | null;
};

function summarize(errors: FieldErrors<EventInput>) {
  return (Object.keys(FIELD_LABELS) as (keyof EventInput)[]).flatMap((name) => {
    const message = errors[name]?.message;
    return typeof message === 'string' ? [{ fieldId: fieldId(name), label: FIELD_LABELS[name] ?? name, message }] : [];
  });
}

export function EventEditor(props: EventEditorProps) {
  const { slug, initial, canEdit, allowed, reviews, places, center, branding } = props;
  const router = useRouter();
  const ids = { mode: useId(), until: useId(), lat: useId(), lng: useId() };
  const [eventId, setEventId] = useState(props.eventId);
  const [status, setStatus] = useState(props.status);
  const [cover, setCover] = useState(props.cover);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState(() => rruleToRecurrence(initial.rrule));
  const [mode, setMode] = useState<'place' | 'address'>(initial.location ? 'address' : 'place');

  const form = useForm<EventInput>({ resolver: zodResolver(EventInputSchema), defaultValues: initial });
  const { control, register, handleSubmit, setValue, getValues, reset, formState } = form;
  const values = useWatch({ control });
  const location = useWatch({ control, name: 'location' });
  const description = useWatch({ control, name: 'description' });

  const updateRecurrence = (next: { frequency: RecurrenceFrequency; until: string | null }) => {
    setRecurrence(next);
    setValue('rrule', recurrenceToRRule(getValues('startsAt'), next), { shouldDirty: true });
  };

  const persist = async (data: EventInput): Promise<string | null> => {
    const payload: EventInput = { ...data, rrule: recurrenceToRRule(data.startsAt, recurrence) };
    const result = await saveEventAction(slug, eventId, payload);
    if (!result.ok) {
      setServerError(result.message);
      return null;
    }
    setServerError(null);
    if (!eventId) window.history.replaceState(null, '', `/${slug}/agenda/${result.data.id}`);
    setEventId(result.data.id);
    setStatus(result.data.status);
    reset(payload);
    return result.data.id;
  };

  const onSave = handleSubmit(async (data) => {
    setPending(true);
    const id = await persist(data);
    setPending(false);
    if (id) toast.success('Événement enregistré');
  });

  const onTransition = (request: TransitionRequest) =>
    handleSubmit(async (data) => {
      setPending(true);
      try {
        let id = eventId;
        if (!id || formState.isDirty) id = canEdit ? await persist(data) : id;
        if (!id) return;
        const result = await transitionEventAction(slug, id, { to: request.to, comment: request.comment ?? null, publishAt: request.publishAt ?? data.publishAt });
        if (!result.ok) {
          setServerError(result.message);
          toast.error(result.message);
          return;
        }
        setStatus(result.data.status);
        toast.success('Statut mis à jour');
        router.replace(`/${slug}/agenda/${id}`);
        router.refresh();
      } finally {
        setPending(false);
      }
    })();

  const point = location?.point ?? null;
  const setPoint = (p: GeoPoint) =>
    setValue('location', { label: getValues('location')?.label ?? '', point: { lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) } }, { shouldDirty: true });

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <form noValidate onSubmit={(e) => void onSave(e)} className="min-w-0 flex-1 space-y-6" aria-label="Événement">
        <FormErrorSummary errors={summarize(formState.errors)} message={serverError} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge kind="content" status={status ?? 'draft'} />
          {status === 'scheduled' && values.publishAt ? <span>Programmé le {formatDateTimeLongFr(new Date(values.publishAt))}</span> : null}
        </div>

        <fieldset disabled={!canEdit} className="space-y-5">
          <legend className="sr-only">Informations de l’événement</legend>
          <FormField id={fieldId('title')} label="Titre" required error={formState.errors.title?.message}>
            {(c) => <Input {...c} {...register('title')} maxLength={120} />}
          </FormField>

          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <RichTextEditor id={fieldId('description')} label="Description" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />

          <FormField id={fieldId('category')} label="Catégorie" required error={formState.errors.category?.message}>
            {(c) => (
              <select {...c} {...register('category')} className="border-input bg-background h-9 w-full max-w-sm rounded-md border px-3 text-sm">
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {EVENT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="startsAt"
              render={({ field, fieldState }) => (
                <DateTimeField
                  id={fieldId('startsAt')}
                  label="Début"
                  required
                  value={field.value}
                  onChange={(iso) => {
                    field.onChange(iso ?? '');
                    if (iso) setValue('rrule', recurrenceToRRule(iso, recurrence));
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="endsAt"
              render={({ field, fieldState }) => (
                <DateTimeField id={fieldId('endsAt')} label="Fin" required value={field.value} onChange={(iso) => field.onChange(iso ?? '')} error={fieldState.error?.message} />
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller control={control} name="allDay" render={({ field }) => <Checkbox id={fieldId('allDay')} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
            <Label htmlFor={fieldId('allDay')}>Journée entière</Label>
          </div>

          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Récurrence</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('frequency')}>Répétition</Label>
                <select
                  id={fieldId('frequency')}
                  value={recurrence.frequency}
                  onChange={(e) => updateRecurrence({ ...recurrence, frequency: RECURRENCE_FREQUENCIES.find((f) => f === e.target.value) ?? 'none' })}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  {RECURRENCE_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {RECURRENCE_FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>
              {recurrence.frequency !== 'none' ? (
                <div className="space-y-1.5">
                  <Label htmlFor={ids.until}>Jusqu’au (inclus)</Label>
                  <Input id={ids.until} type="date" value={recurrence.until ?? ''} onChange={(e) => updateRecurrence({ ...recurrence, until: e.target.value || null })} />
                </div>
              ) : null}
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Lieu</legend>
            <div role="radiogroup" aria-label="Type de lieu" className="flex flex-wrap gap-4">
              {(['place', 'address'] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={ids.mode}
                    value={m}
                    checked={mode === m}
                    onChange={() => {
                      setMode(m);
                      if (m === 'place') setValue('location', null, { shouldDirty: true });
                      else {
                        setValue('placeId', null, { shouldDirty: true });
                        setValue('location', { label: '', point: center }, { shouldDirty: true });
                      }
                    }}
                  />
                  {m === 'place' ? 'Lieu de la carte' : 'Adresse libre'}
                </label>
              ))}
            </div>
            {mode === 'place' ? (
              <FormField id={fieldId('placeId')} label="Lieu">
                {(c) => (
                  <select {...c} {...register('placeId', { setValueAs: nullIfEmpty })} className="border-input bg-background h-9 w-full max-w-md rounded-md border px-3 text-sm">
                    <option value="">Aucun lieu</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            ) : (
              <div className="space-y-3">
                <FormField id={fieldId('location')} label="Adresse ou nom du lieu" required error={formState.errors.location?.message ?? formState.errors.location?.label?.message}>
                  {(c) => (
                    <Input
                      {...c}
                      value={location?.label ?? ''}
                      onChange={(e) => setValue('location', { label: e.target.value, point: point ?? center }, { shouldDirty: true })}
                    />
                  )}
                </FormField>
                <p className="text-muted-foreground text-sm">Cliquez sur la carte ou déplacez l’épingle, ou saisissez les coordonnées.</p>
                <MapView center={point ?? center} zoom={14} ariaLabel="Carte pour placer le lieu de l’événement" pin={point ?? center} onPinChange={setPoint} className="h-64 w-full overflow-hidden rounded-md border" />
                <div className="grid max-w-md gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={ids.lat}>Latitude</Label>
                    <Input id={ids.lat} type="number" step="0.000001" value={point?.lat ?? center.lat} onChange={(e) => setPoint({ lat: Number(e.target.value), lng: point?.lng ?? center.lng })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={ids.lng}>Longitude</Label>
                    <Input id={ids.lng} type="number" step="0.000001" value={point?.lng ?? center.lng} onChange={(e) => setPoint({ lat: point?.lat ?? center.lat, lng: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={fieldId('organizer')} label="Organisateur">
              {(c) => <Input {...c} {...register('organizer', { setValueAs: nullIfEmpty })} maxLength={120} />}
            </FormField>
            <FormField id={fieldId('registrationUrl')} label="Lien d’inscription" help="Adresse en https://" error={formState.errors.registrationUrl?.message}>
              {(c) => <Input {...c} type="url" {...register('registrationUrl', { setValueAs: nullIfEmpty })} />}
            </FormField>
          </div>

          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Tarif</legend>
            <div className="flex items-center gap-2">
              <Checkbox
                id={fieldId('free')}
                checked={values.price?.free ?? true}
                onCheckedChange={(v) => setValue('price', { free: v === true, label: v === true ? null : (getValues('price')?.label ?? '') }, { shouldDirty: true })}
              />
              <Label htmlFor={fieldId('free')}>Gratuit</Label>
            </div>
            {values.price && !values.price.free ? (
              <FormField id={fieldId('price')} label="Tarif" required error={formState.errors.price?.label?.message ?? formState.errors.price?.message}>
                {(c) => <Input {...c} value={values.price?.label ?? ''} onChange={(e) => setValue('price', { free: false, label: e.target.value }, { shouldDirty: true })} />}
              </FormField>
            ) : null}
          </fieldset>

          <Controller
            control={control}
            name="coverMediaId"
            render={({ field }) => (
              <MediaPicker
                slug={slug}
                label="Image"
                value={field.value}
                selected={cover}
                canUpload={canEdit}
                onChange={(media) => {
                  field.onChange(media?.id ?? null);
                  setCover(media ? { url: media.url, altText: media.altText } : null);
                }}
              />
            )}
          />

          <div className="flex items-center gap-2">
            <Controller control={control} name="accessible" render={({ field }) => <Checkbox id={fieldId('accessible')} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
            <Label htmlFor={fieldId('accessible')}>Accessible aux personnes à mobilité réduite</Label>
          </div>
        </fieldset>

        <ContentActions status={status} allowed={allowed} canEdit={canEdit} pending={pending} publishAt={values.publishAt ?? null} onSave={() => void onSave()} onTransition={(r) => void onTransition(r)} />
        {eventId ? <ReviewHistory reviews={reviews} /> : null}
      </form>

      <aside aria-label="Aperçu mobile" className="xl:w-[340px] xl:shrink-0">
        <MobilePreview
          appName={branding.appName}
          colors={branding.colors}
          title={values.title ?? ''}
          summary={values.startsAt ? formatDateFr(new Date(values.startsAt), "EEEE d MMMM 'à' H 'h' mm") : ''}
          body={description}
          kicker={EVENT_CATEGORY_LABELS[values.category ?? initial.category]}
          imageUrl={cover?.url ?? null}
          imageAlt={cover?.altText ?? ''}
          meta={location?.label || places.find((p) => p.id === values.placeId)?.name}
        />
      </aside>
    </div>
  );
}
