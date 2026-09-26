import { z } from 'zod';

import { baseEntityShape, hexColorSchema, INPUT_OMIT, requiredText, slugSchema } from './common';

export const PlaceCategorySchema = z.object({
  ...baseEntityShape,
  key: slugSchema,
  label: requiredText(60),
  /** Nom d'icone lucide en kebab-case (ex. `school`). */
  icon: z.string().regex(/^[a-z0-9-]+$/, { error: "Nom d'icône invalide" }),
  color: hexColorSchema,
  isDefault: z.boolean(),
  hidden: z.boolean(),
});
export type PlaceCategory = z.infer<typeof PlaceCategorySchema>;

export const PlaceCategoryInputSchema = PlaceCategorySchema.omit({ ...INPUT_OMIT, isDefault: true });
export type PlaceCategoryInput = z.infer<typeof PlaceCategoryInputSchema>;
