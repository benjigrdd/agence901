'use client';

import type { ReportPriority, ReportStatus } from '@app/shared';
import { REPORT_PRIORITIES, REPORT_PRIORITY_LABELS, REPORT_STATUS_LABELS } from '@app/shared';
import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/server/errors';

import { addReportNoteAction, assignReportAction, changeReportStatusAction, markDuplicateAction, setReportPriorityAction } from '../actions';

type NearbyView = { id: string; reference: string; address: string; distanceM: number; status: ReportStatus };

type ReportActionsProps = {
  slug: string;
  reportId: string;
  status: ReportStatus;
  priority: ReportPriority;
  serviceId: string | null;
  transitions: ReportStatus[];
  services: { id: string; name: string }[];
  nearby: NearbyView[];
};

const SELECT = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function ReportActions({ slug, reportId, status, priority, serviceId, transitions, services, nearby }: ReportActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nextStatus, setNextStatus] = useState<ReportStatus | ''>(transitions[0] ?? '');
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [service, setService] = useState(serviceId ?? '');
  const [prio, setPrio] = useState<ReportPriority>(priority);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [original, setOriginal] = useState('');
  const [dupError, setDupError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionResult<null>>, success: string, onError?: (message: string) => void, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        onDone?.();
        router.refresh();
      } else {
        onError?.(result.message);
        toast.error(result.message);
      }
    });

  const isRejection = nextStatus === 'rejected';

  const submitStatus = (e: FormEvent) => {
    e.preventDefault();
    if (!nextStatus) return;
    if (isRejection && !message.trim()) {
      setStatusError('Un motif est obligatoire pour rejeter un signalement');
      return;
    }
    setStatusError(null);
    run(
      () =>
        changeReportStatusAction(slug, reportId, {
          to: nextStatus,
          message: message.trim() || null,
          visibility: isRejection || visible ? 'public' : 'internal',
          duplicateOfId: null,
        }),
      `Statut changé : ${REPORT_STATUS_LABELS[nextStatus]}`,
      setStatusError,
      () => setMessage(''),
    );
  };

  return (
    <section aria-labelledby="actions-titre" className="space-y-6 rounded-lg border p-4">
      <h2 id="actions-titre" className="text-lg font-semibold">
        Traitement
      </h2>

      {transitions.length > 0 ? (
        <form onSubmit={submitStatus} className="space-y-3" aria-label="Changer le statut" noValidate>
          <div className="space-y-1">
            <Label htmlFor="nouveau-statut">Nouveau statut</Label>
            <select id="nouveau-statut" className={SELECT} value={nextStatus} onChange={(e) => setNextStatus(transitions.find((t) => t === e.target.value) ?? '')}>
              {transitions.map((s) => (
                <option key={s} value={s}>
                  {REPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="statut-message">
              {isRejection ? 'Motif du rejet' : 'Message (facultatif)'}
              {isRejection ? (
                <span className="text-destructive" aria-hidden="true">
                  {' '}
                  *
                </span>
              ) : null}
            </Label>
            <Textarea
              id="statut-message"
              value={message}
              maxLength={1000}
              aria-required={isRejection}
              aria-invalid={statusError ? true : undefined}
              aria-describedby={statusError ? 'statut-erreur' : undefined}
              onChange={(e) => setMessage(e.target.value)}
            />
            {statusError ? (
              <p id="statut-erreur" role="alert" className="text-destructive text-sm">
                {statusError}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="statut-visible"
              type="checkbox"
              className="size-4"
              checked={isRejection || visible}
              disabled={isRejection}
              onChange={(e) => setVisible(e.target.checked)}
            />
            <Label htmlFor="statut-visible">Visible par l’habitant</Label>
          </div>
          {isRejection ? <p className="text-muted-foreground text-xs">Le motif d’un rejet est toujours communiqué à l’habitant.</p> : null}
          <Button type="submit" disabled={pending}>
            Changer le statut
          </Button>
        </form>
      ) : null}

      <form
        className="space-y-2"
        aria-label="Assigner un service"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => assignReportAction(slug, reportId, service || null), 'Assignation enregistrée');
        }}
      >
        <Label htmlFor="service">Service assigné</Label>
        <div className="flex gap-2">
          <select id="service" className={SELECT} value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Non assigné</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={pending}>
            Assigner
          </Button>
        </div>
      </form>

      <form
        className="space-y-2"
        aria-label="Changer la priorité"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setReportPriorityAction(slug, reportId, prio), 'Priorité modifiée');
        }}
      >
        <Label htmlFor="priorite">Priorité</Label>
        <div className="flex gap-2">
          <select id="priorite" className={SELECT} value={prio} onChange={(e) => setPrio(REPORT_PRIORITIES.find((p) => p === e.target.value) ?? 'normal')}>
            {REPORT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {REPORT_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={pending}>
            Modifier
          </Button>
        </div>
      </form>

      <form
        className="space-y-2"
        aria-label="Ajouter une note interne"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) {
            setNoteError('La note est vide');
            return;
          }
          setNoteError(null);
          run(() => addReportNoteAction(slug, reportId, note), 'Note interne ajoutée', setNoteError, () => setNote(''));
        }}
      >
        <Label htmlFor="note">Note interne</Label>
        <Textarea
          id="note"
          value={note}
          maxLength={1000}
          aria-describedby={noteError ? 'note-erreur note-aide' : 'note-aide'}
          aria-invalid={noteError ? true : undefined}
          onChange={(e) => setNote(e.target.value)}
        />
        <p id="note-aide" className="text-muted-foreground text-xs">
          Jamais visible par l’habitant.
        </p>
        {noteError ? (
          <p id="note-erreur" role="alert" className="text-destructive text-sm">
            {noteError}
          </p>
        ) : null}
        <Button type="submit" variant="outline" disabled={pending}>
          Ajouter la note
        </Button>
      </form>

      {transitions.length > 0 && status !== 'duplicate' ? (
        <Dialog open={dupOpen} onOpenChange={setDupOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Copy aria-hidden="true" />
              Marquer comme doublon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Marquer comme doublon</DialogTitle>
            <DialogDescription>
              Signalements ouverts de la même catégorie, à moins de 100 m, créés depuis moins de 30 jours. Choisissez l’original.
            </DialogDescription>
            {nearby.length === 0 ? (
              <p className="text-sm">Aucun signalement proche ne correspond.</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="sr-only">Signalement d’origine</legend>
                {nearby.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 rounded-md border p-2">
                    <input
                      type="radio"
                      id={`original-${n.id}`}
                      name="original"
                      value={n.id}
                      className="mt-1 size-4"
                      checked={original === n.id}
                      onChange={() => setOriginal(n.id)}
                    />
                    <Label htmlFor={`original-${n.id}`} className="block font-normal">
                      <span className="font-medium">{n.reference}</span> · {REPORT_STATUS_LABELS[n.status]} · à {n.distanceM} m
                      <span className="text-muted-foreground block text-xs">{n.address}</span>
                    </Label>
                  </div>
                ))}
              </fieldset>
            )}
            {dupError ? (
              <p role="alert" className="text-destructive text-sm">
                {dupError}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={pending || nearby.length === 0}
                onClick={() => {
                  if (!original) {
                    setDupError('Choisissez le signalement d’origine');
                    return;
                  }
                  setDupError(null);
                  run(() => markDuplicateAction(slug, reportId, original), 'Signalement marqué comme doublon', setDupError, () => setDupOpen(false));
                }}
              >
                Confirmer le doublon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
