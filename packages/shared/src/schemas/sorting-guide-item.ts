import { z } from 'zod';

import { SORTING_BINS } from '../enums';
import { baseEntityShape, enumSchema, INPUT_OMIT, requiredText } from './common';

export const SortingGuideItemSchema = z.object({
  ...baseEntityShape,
  name: requiredText(80),
  bin: enumSchema(SORTING_BINS),
  advice: requiredText(300),
});
export type SortingGuideItem = z.infer<typeof SortingGuideItemSchema>;

export const SortingGuideItemInputSchema = SortingGuideItemSchema.omit(INPUT_OMIT);
export type SortingGuideItemInput = z.infer<typeof SortingGuideItemInputSchema>;
