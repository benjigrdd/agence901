import { z } from 'zod';

import { httpsUrlSchema } from './common';

/*
 * JSON Tiptap restreint. Types ecrits a la main uniquement parce que le schema
 * est recursif (listes imbriquees) ; ils sont verifies contre les schemas zod
 * via les annotations `z.ZodType<...>`.
 */
export type RichTextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | {
      type: 'link';
      attrs: { href: string; target?: string | null; rel?: string | null; class?: string | null };
    };
export type RichTextText = { type: 'text'; text: string; marks?: RichTextMark[] };
export type RichTextHardBreak = { type: 'hardBreak' };
export type RichTextInline = RichTextText | RichTextHardBreak;
export type RichTextParagraph = { type: 'paragraph'; content?: RichTextInline[] };
export type RichTextHeading = { type: 'heading'; attrs: { level: 2 | 3 }; content?: RichTextInline[] };
export type RichTextListItem = {
  type: 'listItem';
  content: (RichTextParagraph | RichTextBulletList | RichTextOrderedList)[];
};
export type RichTextBulletList = { type: 'bulletList'; content: RichTextListItem[] };
export type RichTextOrderedList = {
  type: 'orderedList';
  attrs?: { start?: number; type?: string | null };
  content: RichTextListItem[];
};
export type RichTextBlock = RichTextParagraph | RichTextHeading | RichTextBulletList | RichTextOrderedList;
export type RichTextDoc = { type: 'doc'; content: RichTextBlock[] };

const markSchema: z.ZodType<RichTextMark> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({
    type: z.literal('link'),
    attrs: z.strictObject({
      href: httpsUrlSchema,
      target: z.string().nullable().optional(),
      rel: z.string().nullable().optional(),
      class: z.string().nullable().optional(),
    }),
  }),
]);

const textSchema = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1),
  marks: z.array(markSchema).optional(),
});

const inlineSchema: z.ZodType<RichTextInline> = z.union([
  textSchema,
  z.strictObject({ type: z.literal('hardBreak') }),
]);

const paragraphSchema: z.ZodType<RichTextParagraph> = z.strictObject({
  type: z.literal('paragraph'),
  content: z.array(inlineSchema).optional(),
});

const headingSchema: z.ZodType<RichTextHeading> = z.strictObject({
  type: z.literal('heading'),
  attrs: z.strictObject({ level: z.union([z.literal(2), z.literal(3)], { error: 'Titres de niveau 2 ou 3 uniquement' }) }),
  content: z.array(inlineSchema).optional(),
});

const listItemSchema: z.ZodType<RichTextListItem> = z.lazy(() =>
  z.strictObject({
    type: z.literal('listItem'),
    content: z.array(z.union([paragraphSchema, bulletListSchema, orderedListSchema])).min(1),
  }),
);

const bulletListSchema: z.ZodType<RichTextBulletList> = z.lazy(() =>
  z.strictObject({ type: z.literal('bulletList'), content: z.array(listItemSchema).min(1) }),
);

const orderedListSchema: z.ZodType<RichTextOrderedList> = z.lazy(() =>
  z.strictObject({
    type: z.literal('orderedList'),
    attrs: z
      .strictObject({ start: z.number().int().optional(), type: z.string().nullable().optional() })
      .optional(),
    content: z.array(listItemSchema).min(1),
  }),
);

const blockSchema: z.ZodType<RichTextBlock> = z.union(
  [paragraphSchema, headingSchema, bulletListSchema, orderedListSchema],
  { error: 'Élément de texte non autorisé' },
);

export const RichTextDocSchema: z.ZodType<RichTextDoc> = z.strictObject({
  type: z.literal('doc'),
  content: z.array(blockSchema),
});

export const EMPTY_RICH_TEXT_DOC: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function inlineToText(nodes: RichTextInline[] | undefined): string {
  return (nodes ?? []).map((n) => (n.type === 'text' ? n.text : '\n')).join('');
}

function blockToText(block: RichTextBlock | RichTextListItem): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return inlineToText(block.content);
    case 'bulletList':
    case 'orderedList':
      return block.content.map(blockToText).join('\n');
    case 'listItem':
      return block.content.map(blockToText).join('\n');
  }
}

/** Texte brut (compteurs de caracteres, resumes, recherche). */
export function richTextToPlainText(doc: RichTextDoc): string {
  return doc.content.map(blockToText).join('\n').trim();
}

/** Construit un document simple : un paragraphe par ligne non vide. */
export function richTextFromPlainText(text: string): RichTextDoc {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): RichTextParagraph => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }));
  return { type: 'doc', content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' }] };
}
