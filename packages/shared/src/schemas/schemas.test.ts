import { describe, expect, it } from 'vitest';

import { ALT_TEXT_REQUIRED_MESSAGE, MediaMetaInputSchema } from './media';
import { PostInputSchema } from './post';
import { ProcedureInputSchema } from './procedure';
import { RichTextDocSchema, richTextFromPlainText, richTextToPlainText } from './rich-text';

describe('RichTextDoc', () => {
  const valid = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Travaux' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Voir le ', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://exemple.fr', target: '_blank' } }] },
          { type: 'hardBreak' },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Un' }] },
              {
                type: 'orderedList',
                attrs: { start: 1, type: null },
                content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deux' }] }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  it('accepte le sous-ensemble autorisé', () => {
    expect(RichTextDocSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['un titre de niveau 1', { type: 'heading', attrs: { level: 1 }, content: [] }],
    ['un nœud inconnu', { type: 'image', attrs: { src: 'https://x.fr/a.png' } }],
    ['un bloc de code', { type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }],
    [
      'un lien http',
      { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'http://x.fr' } }] }] },
    ],
    ['une marque souligné', { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'underline' }] }] }],
    ['un attribut en trop', { type: 'paragraph', attrs: { style: 'color:red' } }],
  ])('rejette %s', (_label, block) => {
    expect(RichTextDocSchema.safeParse({ type: 'doc', content: [block] }).success).toBe(false);
  });

  it('convertit en texte brut et inversement', () => {
    const doc = richTextFromPlainText('Ligne 1\n\nLigne 2');
    expect(RichTextDocSchema.safeParse(doc).success).toBe(true);
    expect(richTextToPlainText(doc)).toBe('Ligne 1\nLigne 2');
  });
});

describe('Media : texte alternatif', () => {
  it('rejette une image non décorative sans texte alternatif', () => {
    const result = MediaMetaInputSchema.safeParse({ altText: '  ', decorative: false, credit: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(ALT_TEXT_REQUIRED_MESSAGE);
  });

  it('accepte une image décorative avec un texte vide', () => {
    expect(MediaMetaInputSchema.safeParse({ altText: '', decorative: true, credit: null }).success).toBe(true);
  });

  it('rejette une image décorative avec un texte', () => {
    expect(MediaMetaInputSchema.safeParse({ altText: 'Mairie', decorative: true, credit: null }).success).toBe(false);
  });
});

describe('Post et Procedure : règles croisées', () => {
  const base = {
    type: 'news',
    title: 'Titre',
    summary: 'Résumé',
    body: richTextFromPlainText('Corps'),
    coverMediaId: null,
    publishAt: null,
    unpublishAt: null,
    districtIds: [],
    topicIds: [],
    pinned: false,
    alertLevel: null,
    sendPush: false,
  };

  it("exige un niveau pour une alerte et le refuse ailleurs", () => {
    expect(PostInputSchema.safeParse({ ...base, type: 'alert' }).success).toBe(false);
    expect(PostInputSchema.safeParse({ ...base, type: 'alert', alertLevel: 'urgent' }).success).toBe(true);
    expect(PostInputSchema.safeParse({ ...base, alertLevel: 'info' }).success).toBe(false);
  });

  it('limite le titre à 120 caractères', () => {
    expect(PostInputSchema.safeParse({ ...base, title: 'x'.repeat(121) }).success).toBe(false);
  });

  it('valide la valeur d’une démarche selon son type', () => {
    const p = { category: 'civil_status', title: 'Passeport', description: 'Demande', order: 0 };
    expect(ProcedureInputSchema.safeParse({ ...p, kind: 'link', value: 'http://x.fr' }).success).toBe(false);
    expect(ProcedureInputSchema.safeParse({ ...p, kind: 'link', value: 'https://x.fr' }).success).toBe(true);
    expect(ProcedureInputSchema.safeParse({ ...p, kind: 'phone', value: '02 47 00 00 00' }).success).toBe(true);
    expect(ProcedureInputSchema.safeParse({ ...p, kind: 'email', value: 'pas-un-email' }).success).toBe(false);
  });
});
