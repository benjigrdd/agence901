import { z } from 'zod';

import { baseEntityShape, INPUT_OMIT, requiredText } from './common';
import { GeoMultiPolygonSchema } from './geo';

export const WasteZoneSchema = z.object({
  ...baseEntityShape,
  name: requiredText(60),
  geom: GeoMultiPolygonSchema,
});
export type WasteZone = z.infer<typeof WasteZoneSchema>;

export const WasteZoneInputSchema = WasteZoneSchema.omit(INPUT_OMIT);
export type WasteZoneInput = z.infer<typeof WasteZoneInputSchema>;
