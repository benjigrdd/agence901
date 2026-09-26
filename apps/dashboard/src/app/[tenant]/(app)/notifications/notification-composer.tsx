'use client';

import type { NotificationInput, NotificationTarget, NotificationTargetType } from '@app/shared';
import { formatNumberFr, NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE, NOTIFICATION_TARGET_TYPES, NOTIFICATION_TARGET_TYPE_LABELS, requiresNotificationJustification } from '@app/shared';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { DateTimeField } from '@/components/date-time-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { estimateAudienceAction, sendNotificationAction } from './actions';

type Option = { id: string; label: string };
type Props = {
  slug: string;
  districts: Option[];
  topics: Option[];
  contents: { value: string; label: string }[];
  existing: { urgent: boolean; createdAt: string; scheduledAt: string | null }[];
  appName: string;
};

const TITLE_MAX = 50;
const BODY_MAX = 150;

export function NotificationComposer({ slug, districts, topics, contents, existing, appName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<NotificationTargetType>('all');
  const [ids, setIds] = useState<string[]>([]);
  const [linked, setLinked] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [justification, setJustification] = useState('');
  const [audience, setAudience] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const target: NotificationTarget = { type: targetType, ids: targetType === 'all' ? [] : ids };
  const targetKey = `${targetType}:${ids.join(',')}`;

  useEffect(() => {
    let cancelled = false;
    const [type, list] = targetKey.split(':');
    const t = { type: NOTIFICATION_TARGET_TYPES.find((x) => x === type) ?? 'all', ids: type === 'all' || !list ? [] : list.split(',') };
    void estimateAudienceAction(slug, t).then((n) => {
      if (!cancelled) setAudience(n);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, targetKey]);

  const needsJustification = requiresNotificationJustification(existing, { urgent, scheduledAt: when === 'later' ? scheduledAt : null }, new Date());
  const options = targetType === 'districts' ? districts : targetType === 'topics' ? topics : [];

  const buildInput = (): NotificationInput => {
    const [type, id] = linked.split(':');
    return {
      title: title.trim(),
      body: body.trim(),
      target,
      linkedEntity: (type === 'post' || type === 'event') && id ? { type, id } : null,
      scheduledAt: when === 'later' ? scheduledAt : null,
      urgent,
      justification: justification.trim() || null,
    };
  };

  const validate = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Le titre est obligatoire';
    if (!body.trim()) next.body = 'Le message est obligatoire';
    if (targetType !== 'all' && ids.length === 0) next['target.ids'] = 'Sélectionnez au moins un élément';
    if (when === 'later' && !scheduledAt) next.scheduledAt = 'Choisissez la date d’envoi';
    if (needsJustification && !justification.trim()) next.justification = NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE;
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirming(true);
  };

  const send = () =>
    startTransition(async () => {
      const result = await sendNotificationAction(slug, buildInput());
      setConfirming(false);
      if (result.ok) {
        toast.success(result.data.scheduled ? 'Notification programmée' : 'Notification envoyée');
        setTitle('');
        setBody('');
        setJustification('');
        setErrors({});
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
      }
    });

  const errorOf = (key: string) =>
    errors[key] ? (
      <p id={`${key.replace('.', '-')}-erreur`} role="alert" className="text-destructive text-sm">
        {errors[key]}
      </p>
    ) : null;

  return (
    <section aria-labelledby="composer" className="grid gap-6 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={validate} noValidate className="space-y-4">
        <h2 id="composer" className="text-lg font-semibold">
          Nouvelle notification
        </h2>
        <div className="space-y-1">
          <Label htmlFor="n-titre">Titre</Label>
          <Input id="n-titre" value={title} maxLength={TITLE_MAX} aria-describedby="n-titre-compteur" aria-invalid={errors.title ? true : undefined} onChange={(e) => setTitle(e.target.value)} />
          <p id="n-titre-compteur" className="text-muted-foreground text-xs">
            {title.length} / {TITLE_MAX} caractères
          </p>
          {errorOf('title')}
        </div>
        <div className="space-y-1">
          <Label htmlFor="n-message">Message</Label>
          <Textarea id="n-message" value={body} maxLength={BODY_MAX} aria-describedby="n-message-compteur" aria-invalid={errors.body ? true : undefined} onChange={(e) => setBody(e.target.value)} />
          <p id="n-message-compteur" className="text-muted-foreground text-xs">
            {body.length} / {BODY_MAX} caractères
          </p>
          {errorOf('body')}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Cible</legend>
          <div className="flex flex-wrap gap-4">
            {NOTIFICATION_TARGET_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`cible-${t}`}
                  name="cible"
                  className="size-4"
                  checked={targetType === t}
                  onChange={() => {
                    setTargetType(t);
                    setIds([]);
                  }}
                />
                <Label htmlFor={`cible-${t}`} className="font-normal">
                  {NOTIFICATION_TARGET_TYPE_LABELS[t]}
                </Label>
              </div>
            ))}
          </div>
          {options.length ? (
            <fieldset className="flex flex-wrap gap-3 rounded-md border p-2">
              <legend className="sr-only">{targetType === 'districts' ? 'Quartiers ciblés' : 'Thèmes ciblés'}</legend>
              {options.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`cible-${o.id}`}
                    className="size-4"
                    checked={ids.includes(o.id)}
                    onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, o.id] : cur.filter((x) => x !== o.id)))}
                  />
                  <Label htmlFor={`cible-${o.id}`} className="font-normal">
                    {o.label}
                  </Label>
                </div>
              ))}
            </fieldset>
          ) : null}
          {errorOf('target.ids')}
          <p className="flex items-center gap-2 text-sm font-medium" aria-live="polite" data-testid="audience">
            <Users className="size-4" aria-hidden="true" />
            {audience === null ? 'Estimation en cours…' : `Environ ${formatNumberFr(audience)} habitant${audience > 1 ? 's' : ''}`}
          </p>
        </fieldset>

        <div className="space-y-1">
          <Label htmlFor="n-lien">Lien vers un contenu (facultatif)</Label>
          <select id="n-lien" value={linked} onChange={(e) => setLinked(e.target.value)} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
            <option value="">Aucun</option>
            {contents.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Envoi</legend>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input type="radio" id="envoi-now" name="envoi" className="size-4" checked={when === 'now'} onChange={() => setWhen('now')} />
              <Label htmlFor="envoi-now" className="font-normal">
                Immédiat
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="envoi-later" name="envoi" className="size-4" checked={when === 'later'} onChange={() => setWhen('later')} />
              <Label htmlFor="envoi-later" className="font-normal">
                Programmé
              </Label>
            </div>
          </div>
          {when === 'later' ? <DateTimeField id="n-date" label="Date et heure d’envoi" value={scheduledAt} onChange={setScheduledAt} required error={errors.scheduledAt} /> : null}
        </fieldset>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="n-urgent" className="size-4" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <Label htmlFor="n-urgent" className="font-normal">
            Urgente (sécurité, coupure, alerte) : hors limite quotidienne
          </Label>
        </div>

        {needsJustification ? (
          <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">
            <p className="text-sm" role="status">
              Plus de 3 notifications non urgentes aujourd’hui : trop de notifications lassent les habitants.
            </p>
            <Label htmlFor="n-justification">Justification</Label>
            <Textarea id="n-justification" maxLength={300} value={justification} aria-invalid={errors.justification ? true : undefined} onChange={(e) => setJustification(e.target.value)} className="bg-white" />
            {errorOf('justification')}
          </div>
        ) : null}

        <Button type="submit" disabled={pending}>
          {when === 'later' ? 'Programmer la notification' : 'Envoyer la notification'}
        </Button>
      </form>

      <aside aria-label="Aperçu de la notification" className="space-y-4">
        <p className="text-sm font-medium">Aperçu</p>
        {(['iOS', 'Android'] as const).map((os) => (
          <figure key={os} className="space-y-1">
            <figcaption className="text-muted-foreground text-xs">{os}</figcaption>
            <div className={os === 'iOS' ? 'rounded-2xl bg-zinc-100 p-3 shadow-sm' : 'rounded-md border-l-4 border-zinc-500 bg-white p-3 shadow'}>
              <p className="text-xs text-zinc-700">{appName}</p>
              <p className="text-sm font-semibold text-zinc-950">{title || 'Titre de la notification'}</p>
              <p className="text-sm text-zinc-800">{body || 'Message de la notification'}</p>
            </div>
          </figure>
        ))}
      </aside>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>Confirmer l’envoi</DialogTitle>
          <DialogDescription>
            Vous allez notifier environ {formatNumberFr(audience ?? 0)} habitant{(audience ?? 0) > 1 ? 's' : ''}. Confirmer ?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button onClick={send} disabled={pending}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
