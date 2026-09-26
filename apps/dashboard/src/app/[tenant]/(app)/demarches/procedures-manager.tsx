'use client';

import type { ProcedureCategory, ProcedureInput, ProcedureKind } from '@app/shared';
import { PROCEDURE_CATEGORIES, PROCEDURE_CATEGORY_LABELS, PROCEDURE_KIND_LABELS, PROCEDURE_KINDS, PROCEDURES_CATALOG } from '@app/shared';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { SortableList } from '@/components/sortable-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { removeProcedureAction, reorderProceduresAction, saveProcedureAction } from './actions';

type ProcedureView = { id: string; category: ProcedureCategory; title: string; description: string; kind: ProcedureKind; value: string; order: number };
type Draft = Omit<ProcedureInput, 'order'> & { id: string | null };

const SELECT = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function ProceduresManager({ slug, canEdit, procedures }: { slug: string; canEdit: boolean; procedures: ProcedureView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(procedures);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titles = new Set(items.map((p) => p.title));
  const suggestions = PROCEDURES_CATALOG.filter((s) => !titles.has(s.title));

  const save = (id: string | null, input: ProcedureInput, done?: () => void) =>
    startTransition(async () => {
      const r = await saveProcedureAction(slug, id, input);
      if (r.ok) {
        toast.success('Démarche enregistrée');
        setErrors({});
        done?.();
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });

  const reorder = (category: ProcedureCategory, reordered: ProcedureView[]) => {
    const next = PROCEDURE_CATEGORIES.flatMap((c) => (c === category ? reordered : items.filter((p) => p.category === c))).map((p, order) => ({ ...p, order }));
    setItems(next);
    startTransition(async () => {
      const r = await reorderProceduresAction(slug, next.map((p) => p.id));
      if (!r.ok) {
        toast.error(r.message);
        setItems(items);
      }
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const { id, ...rest } = draft;
    const order = id ? (items.find((p) => p.id === id)?.order ?? items.length) : items.length;
    save(id, { ...rest, title: rest.title.trim(), description: rest.description.trim(), value: rest.value.trim(), order }, () => setDraft(null));
  };

  return (
    <div className="space-y-8">
      {canEdit ? (
        <section aria-labelledby="catalogue" className="space-y-3">
          <h2 id="catalogue" className="text-lg font-semibold">
            Suggestions
          </h2>
          {suggestions.length === 0 ? <p className="text-muted-foreground text-sm">Toutes les suggestions ont été ajoutées.</p> : null}
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.key}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    const input = { category: s.category, title: s.title, description: s.description, kind: s.kind, value: s.value };
                    // Sans adresse connue (portail famille), on ouvre le formulaire pour la saisir.
                    if (!s.value) setDraft({ id: null, ...input });
                    else save(null, { ...input, order: items.length });
                  }}
                >
                  <Plus aria-hidden="true" />
                  Ajouter<span className="sr-only"> la démarche</span> « {s.title} »
                </Button>
              </li>
            ))}
          </ul>
          <Button onClick={() => setDraft({ id: null, category: 'other', title: '', description: '', kind: 'link', value: '' })}>Nouvelle démarche</Button>
        </section>
      ) : null}

      {draft ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border p-4 md:grid-cols-2" aria-labelledby="demarche-edition">
          <h2 id="demarche-edition" className="font-semibold md:col-span-2">
            {draft.id ? 'Modifier la démarche' : 'Nouvelle démarche'}
          </h2>
          <div className="space-y-1">
            <Label htmlFor="d-titre">Titre</Label>
            <Input id="d-titre" value={draft.title} maxLength={120} aria-invalid={errors.title ? true : undefined} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            {errors.title ? <p role="alert" className="text-destructive text-sm">{errors.title}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-categorie">Catégorie</Label>
            <select id="d-categorie" className={SELECT} value={draft.category} onChange={(e) => setDraft({ ...draft, category: PROCEDURE_CATEGORIES.find((c) => c === e.target.value) ?? 'other' })}>
              {PROCEDURE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PROCEDURE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="d-description">Description courte</Label>
            <Textarea id="d-description" value={draft.description} maxLength={300} aria-invalid={errors.description ? true : undefined} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            {errors.description ? <p role="alert" className="text-destructive text-sm">{errors.description}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-type">Type</Label>
            <select id="d-type" className={SELECT} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: PROCEDURE_KINDS.find((k) => k === e.target.value) ?? 'link' })}>
              {PROCEDURE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PROCEDURE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-valeur">{draft.kind === 'link' ? 'Adresse web (https)' : draft.kind === 'phone' ? 'Téléphone' : 'Email'}</Label>
            <Input id="d-valeur" value={draft.value} maxLength={500} aria-invalid={errors.value ? true : undefined} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            {errors.value ? <p role="alert" className="text-destructive text-sm">{errors.value}</p> : null}
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              Enregistrer la démarche
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {PROCEDURE_CATEGORIES.map((category) => {
        const group = items.filter((p) => p.category === category);
        if (group.length === 0) return null;
        return (
          <section key={category} aria-labelledby={`cat-${category}`} className="space-y-2">
            <h2 id={`cat-${category}`} className="text-lg font-semibold">
              {PROCEDURE_CATEGORY_LABELS[category]}
            </h2>
            <SortableList
              ariaLabel={`Démarches : ${PROCEDURE_CATEGORY_LABELS[category]}`}
              items={group}
              disabled={!canEdit}
              label={(p) => p.title}
              onReorder={(next) => reorder(category, next)}
              render={(p) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {PROCEDURE_KIND_LABELS[p.kind]} · {p.value}
                    </p>
                  </div>
                  {canEdit ? (
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ id: p.id, category: p.category, title: p.title, description: p.description, kind: p.kind, value: p.value })}>
                        Modifier<span className="sr-only"> « {p.title} »</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            const r = await removeProcedureAction(slug, p.id);
                            if (r.ok) {
                              setItems((cur) => cur.filter((x) => x.id !== p.id));
                              toast.success('Démarche supprimée');
                            } else toast.error(r.message);
                          })
                        }
                      >
                        Supprimer<span className="sr-only"> « {p.title} »</span>
                      </Button>
                    </span>
                  ) : null}
                </div>
              )}
            />
          </section>
        );
      })}
    </div>
  );
}
