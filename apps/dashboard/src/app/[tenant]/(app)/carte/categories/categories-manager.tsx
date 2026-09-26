'use client';

import { contrastRatio, isAccessiblePair } from '@app/shared';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { CATEGORY_ICON_NAMES, CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { removePlaceCategoryAction, savePlaceCategoryAction } from '../actions';

type CategoryView = { id: string; key: string; label: string; icon: string; color: string; isDefault: boolean; hidden: boolean };

const CATEGORY_ICONS = CATEGORY_ICON_NAMES;

const slugify = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export function CategoriesManager({ slug, canEdit, categories }: { slug: string; canEdit: boolean; categories: CategoryView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [color, setColor] = useState('#1d4ed8');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const colorOk = /^#[0-9a-fA-F]{6}$/.test(color) && isAccessiblePair('#ffffff', color);

  const toggle = (c: CategoryView) =>
    startTransition(async () => {
      const r = await savePlaceCategoryAction(slug, c.id, { key: c.key, label: c.label, icon: c.icon, color: c.color, hidden: !c.hidden });
      if (r.ok) {
        toast.success(c.hidden ? 'Catégorie affichée' : 'Catégorie masquée');
        router.refresh();
      } else toast.error(r.message);
    });

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!colorOk) {
      setErrors({ color: 'Contraste insuffisant avec le texte blanc (4,5:1 minimum)' });
      return;
    }
    startTransition(async () => {
      const r = await savePlaceCategoryAction(slug, null, { key: slugify(label) || 'categorie', label: label.trim(), icon, color, hidden: false });
      if (r.ok) {
        setErrors({});
        setLabel('');
        toast.success('Catégorie ajoutée');
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <table className="w-full text-sm">
        <caption className="sr-only">Catégories de lieux</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              Catégorie
            </th>
            <th scope="col">Type</th>
            <th scope="col">Visibilité</th>
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
                  <span className="inline-flex size-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: c.color }} aria-hidden="true">
                    <CategoryIcon name={c.icon} className="size-4" />
                  </span>
                  {c.label}
                </span>
              </td>
              <td>{c.isDefault ? 'Par défaut' : 'Personnalisée'}</td>
              <td>{c.hidden ? 'Masquée' : 'Affichée'}</td>
              {canEdit ? (
                <td className="space-x-1 text-right">
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggle(c)}>
                    {c.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {c.hidden ? 'Afficher' : 'Masquer'}
                    <span className="sr-only"> {c.label}</span>
                  </Button>
                  {!c.isDefault ? (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost" aria-label={`Supprimer ${c.label}`}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      }
                      title={`Supprimer « ${c.label} » ?`}
                      description="Les lieux de cette catégorie devront être reclassés."
                      confirmLabel="Supprimer"
                      destructive
                      onConfirm={async () => {
                        const r = await removePlaceCategoryAction(slug, c.id);
                        if (r.ok) {
                          toast.success('Catégorie supprimée');
                          router.refresh();
                        } else toast.error(r.message);
                      }}
                    />
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {canEdit ? (
        <form onSubmit={add} noValidate className="space-y-4 rounded-lg border p-4" aria-labelledby="ajout-cat">
          <h2 id="ajout-cat" className="font-semibold">
            Ajouter une catégorie
          </h2>
          <div className="space-y-1">
            <Label htmlFor="cat-label">Libellé</Label>
            <Input id="cat-label" value={label} maxLength={60} required aria-invalid={errors.label ? true : undefined} onChange={(e) => setLabel(e.target.value)} />
            {errors.label ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.label}
              </p>
            ) : null}
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Icône</legend>
            <div className="grid grid-cols-8 gap-1">
              {CATEGORY_ICONS.map((name) => (
                <label key={name} className="has-checked:ring-primary flex size-9 cursor-pointer items-center justify-center rounded-md border has-checked:ring-2">
                  <input type="radio" name="icon" value={name} className="sr-only" checked={icon === name} onChange={() => setIcon(name)} />
                  <CategoryIcon name={name} className="size-4" />
                  <span className="sr-only">{name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="cat-color">Couleur</Label>
            <div className="flex items-center gap-2">
              <input type="color" aria-label="Choisir la couleur" value={colorOk || /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border" />
              <Input id="cat-color" value={color} onChange={(e) => setColor(e.target.value)} className="w-28 font-mono" aria-describedby="cat-contraste" />
            </div>
            <p id="cat-contraste" className={colorOk ? 'text-sm text-green-800' : 'text-destructive text-sm'} role={errors.color ? 'alert' : undefined}>
              {/^#[0-9a-fA-F]{6}$/.test(color)
                ? `Contraste avec le texte blanc : ${contrastRatio('#ffffff', color).toFixed(1).replace('.', ',')}:1 ${colorOk ? '(conforme)' : '(insuffisant, 4,5:1 minimum)'}`
                : 'Couleur hexadécimale attendue (#RRVVBB)'}
            </p>
          </div>
          <Button type="submit" disabled={pending || !label.trim()}>
            Ajouter
          </Button>
        </form>
      ) : null}
    </div>
  );
}
