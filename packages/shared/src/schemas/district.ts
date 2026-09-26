import { z } from 'zod';

import { baseEntityShape, hexColorSchema, INPUT_OMIT, requiredText } from './common';
import { GeoMultiPolygonSchema } from './geo';

export const DistrictSchema = z.object({
  ...baseEntityShape,
  name: requiredText(60),
  color: hexColorSchema,
  geom: GeoMultiPolygonSchema,
});
export type District = z.infer<typeof DistrictSchema>;

export const DistrictInputSchema = DistrictSchema.omit(INPUT_OMIT);
export type DistrictInput = z.infer<typeof DistrictInputSchema>;
