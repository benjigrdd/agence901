import { z } from 'zod';

import { baseEntityShape, INPUT_OMIT, requiredText } from './common';

/** Theme d'interet propose aux habitants (Culture, Sport, Travaux...). */
export const TopicSchema = z.object({
  ...baseEntityShape,
  label: requiredText(40),
  order: z.number().int().min(0),
});
export type Topic = z.infer<typeof TopicSchema>;

export const TopicInputSchema = TopicSchema.omit(INPUT_OMIT);
export type TopicInput = z.infer<typeof TopicInputSchema>;
