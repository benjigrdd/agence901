'use client';

import type { BrandingColors, RichTextBlock, RichTextDoc, RichTextInline } from '@app/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

type MobilePreviewProps = {
  appName: string;
  colors: BrandingColors;
  title: string;
  summary: string;
  body: RichTextDoc;
  kicker: string;
  imageUrl?: string | null;
  imageAlt?: string;
  meta?: string;
};

function Inline({ nodes }: { nodes: RichTextInline[] | undefined }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => {
        if (n.type === 'hardBreak') return <br key={i} />;
        let el: React.ReactNode = n.text;
        for (const mark of n.marks ?? []) {
          if (mark.type === 'bold') el = <strong>{el}</strong>;
          if (mark.type === 'italic') el = <em>{el}</em>;
          if (mark.type === 'link') el = <span className="underline">{el}</span>;
        }
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

function Block({ block }: { block: RichTextBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="mb-2">
          <Inline nodes={block.content} />
        </p>
      );
    case 'heading':
      return block.attrs.level === 2 ? (
        <p className="mb-1 text-base font-semibold">
          <Inline nodes={block.content} />
        </p>
      ) : (
        <p className="mb-1 font-semibold">
          <Inline nodes={block.content} />
        </p>
      );
    case 'bulletList':
    case 'orderedList': {
      const Tag = block.type === 'bulletList' ? 'ul' : 'ol';
      return (
        <Tag className={block.type === 'bulletList' ? 'mb-2 list-disc pl-5' : 'mb-2 list-decimal pl-5'}>
          {block.content.map((item, i) => (
            <li key={i}>
              {item.content.map((child, j) => (
                <Block key={j} block={child} />
              ))}
            </li>
          ))}
        </Tag>
      );
    }
  }
}

/** Apercu du rendu dans l'app de la commune, aux couleurs de sa marque. */
export function MobilePreview({ appName, colors, title, summary, body, kicker, imageUrl, imageAlt = '', meta }: MobilePreviewProps) {
  const [view, setView] = useState<'card' | 'detail'>('card');
  return (
    <section aria-labelledby="apercu-mobile-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="apercu-mobile-titre" className="text-sm font-semibold">
          Aperçu dans l’application
        </h2>
        <div role="group" aria-label="Vue de l’aperçu" className="flex gap-1">
          <Button type="button" size="sm" variant={view === 'card' ? 'secondary' : 'ghost'} aria-pressed={view === 'card'} onClick={() => setView('card')}>
            Carte
          </Button>
          <Button type="button" size="sm" variant={view === 'detail' ? 'secondary' : 'ghost'} aria-pressed={view === 'detail'} onClick={() => setView('detail')}>
            Détail
          </Button>
        </div>
      </div>
      <div
        className="mx-auto w-[300px] overflow-hidden rounded-[2rem] border-8 border-zinc-900 shadow-xl"
        style={{ backgroundColor: colors.background, color: colors.text }}
        data-testid="apercu-mobile"
        data-primary={colors.primary}
      >
        <div className="px-4 py-3 text-sm font-semibold" style={{ backgroundColor: colors.primary, color: colors.onPrimary }}>
          {appName}
        </div>
        <div className="h-[520px] overflow-y-auto p-3 text-sm">
          {view === 'card' ? (
            <article className="overflow-hidden rounded-xl shadow" style={{ backgroundColor: colors.surface }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- apercu d'une image de la mediatheque
                <img src={imageUrl} alt={imageAlt} className="aspect-[3/2] w-full object-cover" />
              ) : null}
              <div className="space-y-1 p-3">
                <p className="text-xs font-semibold uppercase" style={{ color: colors.primary }}>
                  {kicker}
                </p>
                <p className="font-semibold">{title || 'Titre de l’actualité'}</p>
                <p className="opacity-80">{summary || 'Résumé affiché sur la carte et dans la notification.'}</p>
              </div>
            </article>
          ) : (
            <article>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- apercu d'une image de la mediatheque
                <img src={imageUrl} alt={imageAlt} className="mb-3 aspect-[3/2] w-full rounded-lg object-cover" />
              ) : null}
              <p className="text-xs font-semibold uppercase" style={{ color: colors.primary }}>
                {kicker}
              </p>
              <p className="mb-1 text-lg font-semibold">{title || 'Titre de l’actualité'}</p>
              {meta ? <p className="mb-3 text-xs opacity-80">{meta}</p> : null}
              {body.content.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
