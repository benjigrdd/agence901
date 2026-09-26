'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { MediaUpload } from '@/components/media/media-upload';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { MediaView } from './actions';
import { deleteMediaAction, updateMediaAction } from './actions';

type MediaLibraryProps = { slug: string; initial: MediaView[]; canEdit: boolean };

const TYPE_FILTERS = [
  { value: 'all', label: 'Tous les formats' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/svg+xml', label: 'SVG' },
];

export function MediaLibrary({ slug, initial, canEdit }: MediaLibraryProps) {
  const searchId = useId();
  const typeId = useId();
  const [items, setItems] = useState(initial);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const visible = items.filter((m) => {
    const needle = search.trim().toLowerCase();
    const matchesText = !needle || m.altText.toLowerCase().includes(needle) || (m.credit ?? '').toLowerCase().includes(needle);
    return matchesText && (type === 'all' || m.mime === type);
  });

  const replace = (media: MediaView) => setItems((list) => list.map((m) => (m.id === media.id ? media : m)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs space-y-1">
          <Label htmlFor={searchId}>Rechercher</Label>
          <Input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={typeId}>Format</Label>
          <select
            id={typeId}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {canEdit ? (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <Plus aria-hidden="true" />
                Ajouter une image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une image</DialogTitle>
                <DialogDescription>Le texte alternatif est obligatoire, sauf pour une image décorative.</DialogDescription>
              </DialogHeader>
              <MediaUpload
                slug={slug}
                onUploaded={(media) => {
                  setItems((list) => [media, ...list]);
                  setUploadOpen(false);
                  toast.success('Image ajoutée');
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <p className="text-muted-foreground text-sm" aria-live="polite">
        {visible.length} image{visible.length > 1 ? 's' : ''}
      </p>

      {visible.length === 0 ? (
        <EmptyState title="Aucune image" description="Aucune image ne correspond à votre recherche." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((media) => (
            <li key={media.id} className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- media en data URL (mock) ou URL signee */}
              <img src={media.url} alt={media.decorative ? '' : media.altText} className="aspect-[3/2] w-full object-cover" />
              <div className="space-y-1 p-3 text-sm">
                <p className="font-medium">{media.decorative ? 'Image décorative' : media.altText}</p>
                {media.credit ? <p className="text-muted-foreground">© {media.credit}</p> : null}
                <p className="text-muted-foreground">
                  Utilisée {media.usageCount} fois · {media.width} × {media.height} px
                </p>
                {canEdit ? (
                  <div className="flex gap-2 pt-2">
                    <EditMediaDialog slug={slug} media={media} onSaved={replace} />
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={media.usageCount > 0}
                          title={media.usageCount > 0 ? 'Image utilisée : suppression impossible' : undefined}
                        >
                          <Trash2 aria-hidden="true" />
                          Supprimer<span className="sr-only"> l’image {media.altText}</span>
                        </Button>
                      }
                      title="Supprimer cette image ?"
                      description="L’image sera définitivement retirée de la médiathèque."
                      confirmLabel="Supprimer"
                      destructive
                      onConfirm={async () => {
                        const result = await deleteMediaAction(slug, media.id);
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        setItems((list) => list.filter((m) => m.id !== media.id));
                        toast.success('Image supprimée');
                      }}
                    />
                  </div>
                ) : null}
                {canEdit && media.usageCount > 0 ? (
                  <p className="text-muted-foreground text-xs">Suppression impossible : image utilisée.</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditMediaDialog({ slug, media, onSaved }: { slug: string; media: MediaView; onSaved: (m: MediaView) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [altText, setAltText] = useState(media.altText);
  const [decorative, setDecorative] = useState(media.decorative);
  const [credit, setCredit] = useState(media.credit ?? '');
  const [error, setError] = useState<string | undefined>();

  const save = async () => {
    const result = await updateMediaAction(slug, media.id, {
      altText: decorative ? '' : altText.trim(),
      decorative,
      credit: credit.trim() || null,
    });
    if (!result.ok) {
      setError(result.fieldErrors?.altText ?? result.message);
      return;
    }
    onSaved(result.data);
    setOpen(false);
    toast.success('Image mise à jour');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Modifier<span className="sr-only"> l’image {media.altText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l’image</DialogTitle>
          <DialogDescription>Texte alternatif et crédit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-decorative`} checked={decorative} onCheckedChange={(v) => setDecorative(v === true)} />
            <Label htmlFor={`${id}-decorative`}>Image décorative</Label>
          </div>
          {!decorative ? (
            <FormField id={`${id}-alt`} label="Texte alternatif" required error={error}>
              {(control) => <Input {...control} value={altText} onChange={(e) => setAltText(e.target.value)} />}
            </FormField>
          ) : null}
          <FormField id={`${id}-credit`} label="Crédit">
            {(control) => <Input {...control} value={credit} onChange={(e) => setCredit(e.target.value)} />}
          </FormField>
        </div>
        <DialogFooter>
          <Button onClick={save}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
