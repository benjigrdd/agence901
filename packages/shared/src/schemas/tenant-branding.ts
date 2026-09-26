import { z } from 'zod';

import { baseEntityShape, hexColorSchema, INPUT_OMIT, requiredText } from './common';

export const BrandingColorsSchema = z.object({
  primary: hexColorSchema,
  onPrimary: hexColorSchema,
  secondary: hexColorSchema,
  background: hexColorSchema,
  surface: hexColorSchema,
  text: hexColorSchema,
});
export type BrandingColors = z.infer<typeof BrandingColorsSchema>;

export const TenantBrandingSchema = z.object({
  ...baseEntityShape,
  appName: requiredText(30),
  shortName: requiredText(12),
  colors: BrandingColorsSchema,
  logoUrl: z.string().min(1).nullable(),
  iconUrl: z.string().min(1).nullable(),
});
export type TenantBranding = z.infer<typeof TenantBrandingSchema>;

export const TenantBrandingInputSchema = TenantBrandingSchema.omit(INPUT_OMIT);
export type TenantBrandingInput = z.infer<typeof TenantBrandingInputSchema>;
