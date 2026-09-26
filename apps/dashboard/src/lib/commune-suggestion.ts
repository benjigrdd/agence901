import { z } from 'zod';

export const CommuneSuggestionSchema = z.object({
  inseeCode: z.string(),
  name: z.string(),
  population: z.number(),
  center: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  postalCodes: z.array(z.string()),
});
export type CommuneSuggestion = z.infer<typeof CommuneSuggestionSchema>;
