'use client';

import type { ContentStatus } from '@app/shared';
import { isoToParisInput, parisInputToIso } from '@app/shared';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type TransitionRequest = { to: ContentStatus; comment?: string | null; publishAt?: string | null };

type ContentActionsProps = {
  status: ContentStatus | null;
  /** Statuts cibles autorises par `allowedContentTransitions` (calcules cote serveur). */
  allowed: ContentStatus[];
  canEdit: boolean;
  pending: boolean;
  publishAt: string | null;
  onSave: () => void;
  onTransition: (request: TransitionRequest) => void;
};

/**
 * Barre d'actions pilotee par le workflow : un bouton non autorise n'est pas rendu.
 * La server action revalide toujours les droits via la couche de donnees.
 */
export function ContentActions({ status, allowed, canEdit, pending, publishAt, onSave, onTransition }: ContentActionsProps) {
  const current = status ?? 'draft';
  const has = (to: ContentStatus) => allowed.includes(to);
  return (
    <div role="group" aria-label="Actions" className="flex flex-wrap gap-2">
      {canEdit ? (
        <Button type="button" variant="outline" onClick={onSave} disabled={pending}>
          {current === 'draft' ? 'Enregistrer le brouillon' : 'Enregistrer les modifications'}
        </Button>
      ) : null}
      {current === 'draft' && has('pending_review') ? (
        <Button type="button" variant="secondary" onClick={() => onTransition({ to: 'pending_review' })} disabled={pending}>
          Soumettre à validation
        </Button>
      ) : null}
      {has('published') ? (
        <Button type="button" onClick={() => onTransition({ to: 'published' })} disabled={pending}>
          Publier maintenant
        </Button>
      ) : null}
      {has('scheduled') ? <ScheduleDialog pending={pending} initial={publishAt} onConfirm={(iso) => onTransition({ to: 'scheduled', publishAt: iso })} /> : null}
      {current === 'pending_review' && has('draft') ? (
        <RejectDialog pending={pending} onConfirm={(comment) => onTransition({ to: 'draft', comment })} />
      ) : null}
      {current === 'scheduled' && has('draft') ? (
        <Button type="button" variant="outline" onClick={() => onTransition({ to: 'draft' })} disabled={pending}>
          Remettre en brouillon
        </Button>
      ) : null}
      {has('archived') ? (
        <Button type="button" variant="outline" onClick={() => onTransition({ to: 'archived' })} disabled={pending}>
          Archiver
        </Button>
      ) : null}
    </div>
  );
}

function RejectDialog({ pending, onConfirm }: { pending: boolean; onConfirm: (comment: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={pending}>
          Refuser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser et renvoyer en brouillon</DialogTitle>
          <DialogDescription>Le motif sera visible par l’auteur dans l’historique de validation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={id}>
            Motif du refus <span aria-hidden="true">*</span>
          </Label>
          <Textarea
            id={id}
            value={comment}
            aria-required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-erreur` : undefined}
            onChange={(e) => setComment(e.target.value)}
          />
          {error ? (
            <p id={`${id}-erreur`} className="text-destructive text-sm font-medium">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (!comment.trim()) {
                setError('Un motif est obligatoire pour refuser');
                return;
              }
              setOpen(false);
              onConfirm(comment.trim());
            }}
          >
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({ pending, initial, onConfirm }: { pending: boolean; initial: string | null; onConfirm: (iso: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(isoToParisInput(initial));
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" disabled={pending}>
          Programmer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Programmer la publication</DialogTitle>
          <DialogDescription>La publication aura lieu automatiquement à la date choisie (heure de Paris).</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={id}>Date et heure de publication</Label>
          <Input
            id={id}
            type="datetime-local"
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-erreur` : undefined}
            onChange={(e) => setValue(e.target.value)}
          />
          {error ? (
            <p id={`${id}-erreur`} className="text-destructive text-sm font-medium">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              const iso = parisInputToIso(value);
              if (!iso || Date.parse(iso) <= Date.now()) {
                setError('Choisissez une date dans le futur');
                return;
              }
              setOpen(false);
              onConfirm(iso);
            }}
          >
            Programmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
