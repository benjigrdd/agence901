import { z } from 'zod';

import { baseEntityShape, idSchema, INPUT_OMIT, requiredText } from './common';

export const OnboardingStepSchema = z.object({
  key: z.string().min(1),
  label: requiredText(120),
  done: z.boolean(),
});
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const TenantStoreInfoSchema = z.object({
  ...baseEntityShape,
  iosBundleId: z
    .string()
    .regex(/^[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*)+$/, { error: 'Identifiant de bundle iOS invalide' }),
  androidPackage: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, { error: 'Nom de paquet Android invalide' }),
  easProjectId: idSchema.nullable(),
  appStoreId: z.string().regex(/^\d+$/, { error: 'Identifiant App Store invalide' }).nullable(),
  onboardingChecklist: z.array(OnboardingStepSchema),
});
export type TenantStoreInfo = z.infer<typeof TenantStoreInfoSchema>;

export const TenantStoreInfoInputSchema = TenantStoreInfoSchema.omit(INPUT_OMIT);
export type TenantStoreInfoInput = z.infer<typeof TenantStoreInfoInputSchema>;
