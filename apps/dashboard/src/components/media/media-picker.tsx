'use client';

import { ImageOff } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import type { MediaView } from '@/app/[tenant]/(app)/mediatheque/actions';
import { listMediaAction } from '@/app/[tenant]/(app)/mediatheque/actions';
import { MediaUpload } from '@/components/media/media-upload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type MediaPickerProps = {
  slug: string;
  label: string;
  value: string | null;
  /** Apercu de l'image deja choisie (evite un aller-retour serveur). */
  selected?: { url: string; altText: string } | null;
  onChange: (media: MediaView | null) => void;
  canUpload?: boolean;
};

export function MediaPicker({ slug, label, value, selected, onChange, canUpload = true }: MediaPickerProps) {
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || items !== null) return;
    let active = true;
    void listMediaAction(slug).then((result) => {
      if (!active) return;
      if (result.ok) setItems(result.data);
      else setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [open, items, slug]);

  const visible = (items ?? []).filter((m) => {
    const needle = search.trim().toLowerCase();
    return !needle || m.altText.toLowerCase().includes(needle) || (m.credit ?? '').toLowerCase().includes(needle);
  });

  const choose = (media: MediaView | null) => {
    onChange(media);
    setOpen(false);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-center gap-3">
        {value && selected ? (
          // eslint-disable-next-line @next/next/no-img-element -- media en data URL (mock) ou URL signee
          <img src={selected.url} alt={selected.altText} className="h-20 w-32 rounded-md border object-cover" />
        ) : (
          <span className="text-muted-foreground flex h-20 w-32 items-center justify-center rounded-md border text-xs">
            Aucune image
          </span>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              {value ? 'Changer l’image' : 'Choisir une image'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
              <DialogDescription>Choisissez une image de la médiathèque ou téléversez-en une nouvelle.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="library">
              <TabsList>
                <TabsTrigger value="library">Médiathèque</TabsTrigger>
                {canUpload ? <TabsTrigger value="upload">Téléverser</TabsTrigger> : null}
              </TabsList>
              <TabsContent value="library" className="space-y-3">
                <div className="max-w-xs space-y-1">
                  <Label htmlFor={searchId}>Rechercher une image</Label>
                  <Input id={searchId} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {error ? <p role="alert">{error}</p> : null}
                {items === null && !error ? <p aria-live="polite">Chargement…</p> : null}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {visible.map((media) => (
                    <li key={media.id}>
                      <button
                        type="button"
                        onClick={() => choose(media)}
                        aria-pressed={media.id === value}
                        className={cn(
                          'w-full overflow-hidden rounded-md border text-left',
                          media.id === value ? 'ring-primary ring-2' : 'hover:border-primary',
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- media en data URL (mock) */}
                        <img src={media.url} alt="" className="aspect-[3/2] w-full object-cover" />
                        <span className="block truncate p-1 text-xs">{media.decorative ? 'Image décorative' : media.altText}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {value ? (
                  <Button type="button" variant="ghost" onClick={() => choose(null)}>
                    <ImageOff aria-hidden="true" />
                    Retirer l’image
                  </Button>
                ) : null}
              </TabsContent>
              {canUpload ? (
                <TabsContent value="upload">
                  <MediaUpload
                    slug={slug}
                    onUploaded={(media) => {
                      setItems((current) => [media, ...(current ?? [])]);
                      choose(media);
                    }}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </fieldset>
  );
}
