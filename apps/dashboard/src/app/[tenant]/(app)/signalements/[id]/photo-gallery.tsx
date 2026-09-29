'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** Galerie et visionneuse accessible : fleches clavier, Echap, « Photo n sur N ». */
export function PhotoGallery({ photos, reference }: { photos: string[]; reference: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (photos.length === 0) return <p className="text-muted-foreground text-sm">Aucune photo jointe.</p>;
  const total = photos.length;
  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + total) % total));
  const current = index === null ? null : photos[index];

  return (
    <section aria-labelledby="photos-titre" className="space-y-2">
      <h2 id="photos-titre" className="text-lg font-semibold">
        Photos
      </h2>
      <ul className="flex flex-wrap gap-3">
        {photos.map((url, i) => (
          <li key={url}>
            <button type="button" onClick={() => setIndex(i)} className="focus-visible:ring-ring overflow-hidden rounded-md border focus-visible:ring-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL fournie par la couche de donnees (signee plus tard) */}
              <img src={url} alt={`Signalement ${reference}, vue ${i + 1} sur ${total}`} className="size-32 object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={index !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          className="max-w-3xl"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
          }}
        >
          <DialogTitle>
            Photo {(index ?? 0) + 1} sur {total}
          </DialogTitle>
          <DialogDescription>Utilisez les flèches gauche et droite pour changer de photo, Échap pour fermer.</DialogDescription>
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL fournie par la couche de donnees
            <img src={current} alt={`Signalement ${reference}, vue ${(index ?? 0) + 1} sur ${total}`} className="max-h-[70vh] w-full rounded-md object-contain" />
          ) : null}
          {total > 1 ? (
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => go(-1)}>
                <ChevronLeft aria-hidden="true" />
                Photo précédente
              </Button>
              <Button variant="outline" onClick={() => go(1)}>
                Photo suivante
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
