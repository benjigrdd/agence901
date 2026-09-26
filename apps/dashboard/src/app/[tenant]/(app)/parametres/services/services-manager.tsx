'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { CATEGORY_ICON_NAMES, CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/server/errors';

import { removeServiceAction, saveReportCategoryAction, saveServiceAction } from './actions';

const SELECT = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

function useSaver() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = (fn: () => Promise<ActionResult<null>>, success: string, done?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors({});
        toast.success(success);
        done?.();
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  return { pending, errors, run };
}

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  ) : null;

type ServiceView = { id: string; name: string; email: string | null };

export function ServicesManager({ slug, canEdit, services }: { slug: string; canEdit: boolean; services: ServiceView[] }) {
  const { pending, errors, run } = useSaver();
  const [draft, setDraft] = useState<{ id: string | null; name: string; email: string } | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    run(() => saveServiceAction(slug, draft.id, { name: draft.name.trim(), email: draft.email.trim() || null }), 'Service enregistré', () => setDraft(null));
  };
  return (
    <section aria-labelledby="services-titre" className="space-y-3">
      <h2 id="services-titre" className="text-lg font-semibold">
        Services municipaux
      </h2>
      <ul className="divide-y rounded-lg border">
        {services.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span>
              <strong>{s.name}</strong> · {s.email ?? 'sans email de notification'}
            </span>
            {canEdit ? (
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ id: s.id, name: s.name, email: s.email ?? '' })}>
                  Modifier<span className="sr-only"> {s.name}</span>
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeServiceAction(slug, s.id), 'Service supprimé')}>
                  Supprimer<span className="sr-only"> {s.name}</span>
                </Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit && !draft ? <Button onClick={() => setDraft({ id: null, name: '', email: '' })}>Ajouter un service</Button> : null}
      {draft ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2" aria-label="Service">
          <div className="space-y-1">
            <Label htmlFor="s-nom">Nom</Label>
            <Input id="s-nom" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-email">Email de notification</Label>
            <Input id="s-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <FieldError message={errors.email} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Enregistrer
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

type CategoryView = { id: string; label: string; icon: string; defaultServiceId: string | null; slaDays: number };

export function ReportCategoriesManager({ slug, canEdit, services, categories }: { slug: string; canEdit: boolean; services: { id: string; name: string }[]; categories: CategoryView[] }) {
  const { pending, errors, run } = useSaver();
  const [draft, setDraft] = useState<(Omit<CategoryView, 'id'> & { id: string | null }) | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const { id, ...input } = draft;
    run(() => saveReportCategoryAction(slug, id, { ...input, label: input.label.trim() }), 'Catégorie enregistrée', () => setDraft(null));
  };
  return (
    <section aria-labelledby="categories-titre" className="space-y-3">
      <h2 id="categories-titre" className="text-lg font-semibold">
        Catégories de signalement
      </h2>
      <table className="w-full text-sm">
        <caption className="sr-only">Catégories de signalement</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              Catégorie
            </th>
            <th scope="col">Service par défaut</th>
            <th scope="col">Délai cible</th>
            {canEdit ? (
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2">
                <span className="inline-flex items-center gap-2">
                  <CategoryIcon name={c.icon} className="size-4" />
                  {c.label}
                </span>
              </td>
              <td>{services.find((s) => s.id === c.defaultServiceId)?.name ?? '—'}</td>
              <td>{c.slaDays} jours</td>
              {canEdit ? (
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...c })}>
                    Modifier<span className="sr-only"> {c.label}</span>
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && !draft ? <Button onClick={() => setDraft({ id: null, label: '', icon: 'map-pin', defaultServiceId: null, slaDays: 7 })}>Ajouter une catégorie</Button> : null}
      {draft ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Catégorie de signalement">
          <div className="space-y-1">
            <Label htmlFor="rc-libelle">Libellé</Label>
            <Input id="rc-libelle" value={draft.label} maxLength={60} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <FieldError message={errors.label} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-icone">Icône</Label>
            <select id="rc-icone" className={SELECT} value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })}>
              {[...new Set([draft.icon, ...CATEGORY_ICON_NAMES])].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-service">Service par défaut</Label>
            <select id="rc-service" className={SELECT} value={draft.defaultServiceId ?? ''} onChange={(e) => setDraft({ ...draft, defaultServiceId: e.target.value || null })}>
              <option value="">Aucun</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-delai">Délai cible (jours)</Label>
            <Input id="rc-delai" type="number" min={1} max={90} value={draft.slaDays} onChange={(e) => setDraft({ ...draft, slaDays: Number(e.target.value) })} />
            <FieldError message={errors.slaDays} />
          </div>
          <div className="flex gap-2 lg:col-span-4">
            <Button type="submit" disabled={pending}>
              Enregistrer
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
