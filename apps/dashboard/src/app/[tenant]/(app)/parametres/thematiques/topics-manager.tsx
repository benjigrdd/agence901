'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { SortableList } from '@/components/sortable-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { removeTopicAction, saveTopicAction } from '../services/actions';

type TopicView = { id: string; label: string; order: number };

export function TopicsManager({ slug, canEdit, topics }: { slug: string; canEdit: boolean; topics: TopicView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(topics);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reorder = (next: TopicView[]) => {
    setItems(next);
    startTransition(async () => {
      for (const [order, t] of next.entries()) {
        if (t.order !== order) await saveTopicAction(slug, t.id, { label: t.label, order });
      }
      router.refresh();
    });
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveTopicAction(slug, null, { label: label.trim(), order: items.length });
      if (r.ok) {
        setLabel('');
        setError(null);
        toast.success('Thématique ajoutée');
        router.refresh();
      } else setError(r.fieldErrors?.label ?? r.message);
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <SortableList
        ariaLabel="Thématiques"
        items={items}
        disabled={!canEdit}
        label={(t) => t.label}
        onReorder={reorder}
        render={(t) => (
          <div className="flex items-center justify-between gap-2">
            <span>{t.label}</span>
            {canEdit ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  startTransition(async () => {
                    const r = await removeTopicAction(slug, t.id);
                    if (r.ok) setItems((cur) => cur.filter((x) => x.id !== t.id));
                    else toast.error(r.message);
                  })
                }
              >
                Supprimer<span className="sr-only"> {t.label}</span>
              </Button>
            ) : null}
          </div>
        )}
      />
      {canEdit ? (
        <form onSubmit={add} noValidate className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="theme-libelle">Nouvelle thématique</Label>
            <Input id="theme-libelle" value={label} maxLength={40} aria-invalid={error ? true : undefined} aria-describedby={error ? 'theme-erreur' : undefined} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button type="submit" disabled={pending || !label.trim()}>
            Ajouter
          </Button>
        </form>
      ) : null}
      {error ? (
        <p id="theme-erreur" role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
