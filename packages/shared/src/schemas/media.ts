import { z } from 'zod';

import { baseEntityShape, INPUT_OMIT, optionalText } from './common';

export const ALT_TEXT_REQUIRED_MESSAGE = 'Le texte alternatif est obligatoire (sauf image décorative)';

const mediaShape = {
  ...baseEntityShape,
  path: z.string().min(1),
  url: z.string().min(1),
  mime: z.string().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/, { error: "Format d'image non pris en charge" }),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  altText: z.string().trim().max(250, { error: '250 caractères maximum' }),
  decorative: z.boolean(),
  credit: optionalText(120),
};

function checkAltText(m: { altText: string; decorative: boolean }, ctx: z.RefinementCtx) {
  if (m.decorative && m.altText !== '') {
    ctx.addIssue({ code: 'custom', path: ['altText'], message: 'Une image décorative a un texte alternatif vide' });
  }
  if (!m.decorative && m.altText === '') {
    ctx.addIssue({ code: 'custom', path: ['altText'], message: ALT_TEXT_REQUIRED_MESSAGE });
  }
}

export const MediaSchema = z.object(mediaShape).superRefine(checkAltText);
export type Media = z.infer<typeof MediaSchema>;

export const MediaInputSchema = z.object(mediaShape).omit(INPUT_OMIT).superRefine(checkAltText);
export type MediaInput = z.infer<typeof MediaInputSchema>;

/** Metadonnees saisies au televersement ou en modification. */
export const MediaMetaInputSchema = z
  .object({ altText: mediaShape.altText, decorative: mediaShape.decorative, credit: mediaShape.credit })
  .superRefine(checkAltText);
export type MediaMetaInput = z.infer<typeof MediaMetaInputSchema>;
