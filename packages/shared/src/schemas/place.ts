import { z } from 'zod';

import { PLACE_SOURCES, WHEELCHAIR_ACCESS } from '../enums';
import {
  baseEntityShape,
  enumSchema,
  httpsUrlSchema,
  idSchema,
  INPUT_OMIT,
  optionalText,
  phoneSchema,
  requiredText,
} from './common';
import { GeoPointSchema } from './geo';

export const PlaceAccessibilitySchema = z.object({
  wheelchair: enumSchema(WHEELCHAIR_ACCESS),
  toilets: z.boolean(),
});
export type PlaceAccessibility = z.infer<typeof PlaceAccessibilitySchema>;

/** Informations complementaires issues des imports (sous-type OSM, points de charge IRVE…). */
export const PlaceAttributesSchema = z.object({
  subtype: z.string().max(60).optional(),
  chargePoints: z.number().int().min(0).optional(),
  powersKw: z.array(z.number().min(0)).max(20).optional(),
  operator: z.string().max(120).optional(),
});
export type PlaceAttributes = z.infer<typeof PlaceAttributesSchema>;

export const PlaceSchema = z.object({
  ...baseEntityShape,
  categoryId: idSchema,
  name: requiredText(120),
  point: GeoPointSchema,
  address: requiredText(300),
  /** Horaires au format OSM `opening_hours`. */
  openingHours: optionalText(500),
  phone: phoneSchema.nullable(),
  website: httpsUrlSchema.nullable(),
  description: optionalText(1000),
  accessibility: PlaceAccessibilitySchema,
  photoMediaId: idSchema.nullable(),
  source: enumSchema(PLACE_SOURCES),
  externalId: z.string().min(1).nullable(),
  /** Lieu importe puis modifie a la main : les imports suivants ne l'ecrasent plus. */
  detached: z.boolean(),
  attributes: PlaceAttributesSchema,
});
export type Place = z.infer<typeof PlaceSchema>;

export const PlaceInputSchema = PlaceSchema.omit(INPUT_OMIT);
export type PlaceInput = z.infer<typeof PlaceInputSchema>;
