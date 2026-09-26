import { z } from 'zod';

import { HOME_TILES } from '../enums';
import {
  baseEntityShape,
  emailSchema,
  enumSchema,
  httpsUrlSchema,
  INPUT_OMIT,
  optionalText,
  phoneSchema,
} from './common';

export const HomeLayoutItemSchema = z.object({
  tile: enumSchema(HOME_TILES),
  enabled: z.boolean(),
});
export type HomeLayoutItem = z.infer<typeof HomeLayoutItemSchema>;

export const HomeLayoutSchema = z
  .array(HomeLayoutItemSchema)
  .refine((items) => new Set(items.map((i) => i.tile)).size === items.length, {
    error: 'Chaque tuile ne peut apparaître qu’une fois',
  });

export const AppLinksSchema = z.object({
  legalNotice: httpsUrlSchema.nullable(),
  privacy: httpsUrlSchema.nullable(),
  accessibility: httpsUrlSchema.nullable(),
});
export type AppLinks = z.infer<typeof AppLinksSchema>;

export const ContactInfoSchema = z.object({
  /** Horaires au format OSM `opening_hours`. */
  openingHours: optionalText(500),
  phone: phoneSchema.nullable(),
  email: emailSchema.nullable(),
  address: optionalText(300),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const TenantAppConfigSchema = z.object({
  ...baseEntityShape,
  homeLayout: HomeLayoutSchema,
  links: AppLinksSchema,
  contact: ContactInfoSchema,
});
export type TenantAppConfig = z.infer<typeof TenantAppConfigSchema>;

export const TenantAppConfigInputSchema = TenantAppConfigSchema.omit(INPUT_OMIT);
export type TenantAppConfigInput = z.infer<typeof TenantAppConfigInputSchema>;
