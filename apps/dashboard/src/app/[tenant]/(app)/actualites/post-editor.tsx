'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { BrandingColors, ContentStatus, PostInput } from '@app/shared';
import {
  ALERT_LEVEL_LABELS,
  ALERT_LEVELS,
  formatDateFr,
  formatDateTimeLongFr,
  POST_TYPE_LABELS,
  POST_TYPES,
  PostInputSchema,
} from '@app/shared';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { MediaPicker } from '@/components/media/media-picker';
import { MobilePreview } from '@/components/mobile-preview';
import { RichTextEditor } from '@/components/rich-text-editor';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { savePostAction, transitionPostAction } from './actions';

const AUTOSAVE_DELAY_MS = 30_000;

const FIELD_LABELS: Partial<Record<keyof PostInput, string>> = {
  title: 'Titre',
  type: 'Type',
  summary: 'Résumé',
  body: 'Corps',
  alertLevel: 'Niveau d’alerte',
  publishAt: 'Date de publication',
  unpublishAt: 'Date de dépublication',
};

type PostEditorProps = {
  slug: string;
  postId: string | null;
  initial: PostInput;
  status: ContentStatus | null;
  canEdit: boolean;
  allowed: ContentStatus[];
  reviews: ReviewView[];
  districts: { id: string; name: string }[];
  topics: { id: string; label: string }[];
  branding: { appName: string; colors: BrandingColors };
  cover: { url: string; altText: string } | null;
};

const fieldId = (name: string) => `post-${name}`;

function summarize(errors: FieldErrors<PostInput>) {
  return (Object.keys(FIELD_LABELS) as (keyof PostInput)[]).flatMap((name) => {
    const message = errors[name]?.message;
    return typeof message === 'string' ? [{ fieldId: fieldId(name), label: FIELD_LABELS[name] ?? name, message }] : [];
  });
}

export function PostEditor(props: PostEditorProps) {
  const { slug, initial, canEdit, allowed, reviews, districts, topics, branding } = props;
  const router = useRouter();
  const [postId, setPostId] = useState(props.postId);
  const [status, setStatus] = useState(props.status);
  const [cover, setCover] = useState(props.cover);
  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  const form = useForm<PostInput>({ resolver: zodResolver(PostInputSchema), defaultValues: initial });
  const { control, register, handleSubmit, getValues, reset, setError, formState } = form;
  const values = useWatch({ control });
  const body = useWatch({ control, name: 'body' });
  const readOnly = !canEdit;

  const applyServerErrors = (fieldErrors: Record<string, string> | undefined) => {
    for (const name of Object.keys(FIELD_LABELS) as (keyof PostInput)[]) {
      const message = fieldErrors?.[name];
      if (message) setError(name, { message });
    }
  };

  const persist = async (data: PostInput): Promise<string | null> => {
    const result = await savePostAction(slug, postId, data);
    if (!result.ok) {
      setServerError(result.message);
      applyServerErrors(result.fieldErrors);
      return null;
    }
    setServerError(null);
    if (!postId) window.history.replaceState(null, '', `/${slug}/actualites/${result.data.id}`);
    setPostId(result.data.id);
    setStatus(result.data.status);
    setSavedAt(new Date());
    setAutosaveNote(null);
    reset(data);
    return result.data.id;
  };

  // Enregistrement automatique du brouillon 30 s apres la derniere frappe.
  useEffect(() => {
    if (readOnly || (status !== null && status !== 'draft') || !formState.isDirty) return;
    const timer = setTimeout(() => {
      const parsed = PostInputSchema.safeParse(getValues());
      if (!parsed.success) {
        setAutosaveNote('Brouillon non enregistré : complétez le titre, le type et le résumé.');
        return;
      }
      void persist(parsed.data);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relance le minuteur a chaque frappe uniquement
  }, [values, readOnly, status, formState.isDirty]);

  const onSave = handleSubmit(async (data) => {
    setPending(true);
    const id = await persist(data);
    setPending(false);
    if (id) toast.success('Brouillon enregistré');
  });

  const onTransition = (request: TransitionRequest) =>
    handleSubmit(async (data) => {
      setPending(true);
      try {
        let id = postId;
        if (!id || formState.isDirty) id = canEdit ? await persist(data) : id;
        if (!id) return;
        const result = await transitionPostAction(slug, id, { to: request.to, comment: request.comment ?? null, publishAt: request.publishAt ?? data.publishAt });
        if (!result.ok) {
          setServerError(result.message);
          toast.error(result.message);
          return;
        }
        setStatus(result.data.status);
        toast.success('Statut mis à jour');
        router.replace(`/${slug}/actualites/${id}`);
        router.refresh();
      } finally {
        setPending(false);
      }
    })();

  const errorsSummary = summarize(formState.errors);
  const type = values.type ?? initial.type;

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <form noValidate onSubmit={(e) => void onSave(e)} className="min-w-0 flex-1 space-y-6" aria-label="Actualité">
        <FormErrorSummary errors={errorsSummary} message={serverError} />

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {status ? <StatusBadge kind="content" status={status} /> : <StatusBadge kind="content" status="draft" />}
          {status === 'scheduled' && values.publishAt ? (
            <span>Programmée le {formatDateTimeLongFr(new Date(values.publishAt))}</span>
          ) : null}
          <span role="status" className="text-muted-foreground">
            {savedAt ? `Enregistré à ${formatDateFr(savedAt, "H 'h' mm")}` : autosaveNote ?? ''}
          </span>
        </div>

        <fieldset disabled={readOnly} className="space-y-5">
          <legend className="sr-only">Contenu de l’actualité</legend>
          <FormField id={fieldId('title')} label="Titre" required error={formState.errors.title?.message} help={`${values.title?.length ?? 0} / 120 caractères`}>
            {(c) => <Input {...c} {...register('title')} maxLength={120} />}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={fieldId('type')} label="Type" required error={formState.errors.type?.message}>
              {(c) => (
                <select {...c} {...register('type')} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {POST_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            {type === 'alert' ? (
              <FormField id={fieldId('alertLevel')} label="Niveau d’alerte" required error={formState.errors.alertLevel?.message}>
                {(c) => (
                  <select
                    {...c}
                    {...register('alertLevel', { setValueAs: (v: string | null) => (v ? v : null) })}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Choisir…</option>
                    {ALERT_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {ALERT_LEVEL_LABELS[l]}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            ) : null}
          </div>

          {type === 'alert' ? (
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="sendPush"
                render={({ field }) => (
                  <Checkbox id={fieldId('sendPush')} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                )}
              />
              <Label htmlFor={fieldId('sendPush')}>Envoyer une notification push</Label>
            </div>
          ) : null}

          <FormField
            id={fieldId('summary')}
            label="Résumé"
            required
            error={formState.errors.summary?.message}
            help={`Utilisé pour les cartes et les notifications · ${values.summary?.length ?? 0} / 280 caractères`}
          >
            {(c) => <Textarea {...c} {...register('summary')} maxLength={280} rows={3} />}
          </FormField>

          <Controller
            control={control}
            name="body"
            render={({ field, fieldState }) => (
              <div>
                <RichTextEditor id={fieldId('body')} label="Corps" value={field.value} onChange={field.onChange} maxLength={10000} error={fieldState.error?.message} />
                {fieldState.error?.message ? <p className="text-destructive text-sm font-medium">{fieldState.error.message}</p> : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="coverMediaId"
            render={({ field }) => (
              <MediaPicker
                slug={slug}
                label="Image de couverture"
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

          <Controller
            control={control}
            name="districtIds"
            render={({ field }) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Quartiers ciblés</legend>
                <p className="text-muted-foreground text-sm">Aucun quartier coché : toute la commune.</p>
                <div className="flex flex-wrap gap-4">
                  {districts.map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`${fieldId('district')}-${d.id}`}
                        checked={field.value.includes(d.id)}
                        onCheckedChange={(v) => field.onChange(v === true ? [...field.value, d.id] : field.value.filter((x) => x !== d.id))}
                      />
                      <Label htmlFor={`${fieldId('district')}-${d.id}`}>{d.name}</Label>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}
          />

          <Controller
            control={control}
            name="topicIds"
            render={({ field }) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Thèmes</legend>
                <div className="flex flex-wrap gap-4">
                  {topics.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`${fieldId('topic')}-${t.id}`}
                        checked={field.value.includes(t.id)}
                        onCheckedChange={(v) => field.onChange(v === true ? [...field.value, t.id] : field.value.filter((x) => x !== t.id))}
                      />
                      <Label htmlFor={`${fieldId('topic')}-${t.id}`}>{t.label}</Label>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}
          />

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="pinned"
              render={({ field }) => <Checkbox id={fieldId('pinned')} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />}
            />
            <Label htmlFor={fieldId('pinned')}>Épingler en tête</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="publishAt"
              render={({ field, fieldState }) => (
                <DateTimeField id={fieldId('publishAt')} label="Date de publication" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={control}
              name="unpublishAt"
              render={({ field, fieldState }) => (
                <DateTimeField id={fieldId('unpublishAt')} label="Date de dépublication" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </div>
        </fieldset>

        <ContentActions
          status={status}
          allowed={allowed}
          canEdit={canEdit}
          pending={pending}
          publishAt={values.publishAt ?? null}
          onSave={() => void onSave()}
          onTransition={(request) => void onTransition(request)}
        />

        {postId ? <ReviewHistory reviews={reviews} /> : null}
      </form>

      <aside aria-label="Aperçu mobile" className="xl:w-[340px] xl:shrink-0">
        <Button type="button" variant="ghost" size="sm" aria-expanded={previewOpen} aria-controls="apercu-mobile" onClick={() => setPreviewOpen((o) => !o)}>
          {previewOpen ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
          {previewOpen ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}
        </Button>
        {previewOpen ? (
          <div id="apercu-mobile" className="mt-3">
            <MobilePreview
              appName={branding.appName}
              colors={branding.colors}
              title={values.title ?? ''}
              summary={values.summary ?? ''}
              body={body}
              kicker={POST_TYPE_LABELS[type]}
              imageUrl={cover?.url ?? null}
              imageAlt={cover?.altText ?? ''}
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
