import { z } from 'zod';

import { STORE_PUBLICATION_STATUSES } from '../enums';
import { baseEntityShape, enumSchema, httpsUrlSchema, idSchema, INPUT_OMIT, isoDateTimeSchema, optionalText, requiredText } from './common';

export const OnboardingStepSchema = z.object({
  key: z.string().min(1),
  label: requiredText(120),
  done: z.boolean(),
  /** Horodatage de la case cochee. */
  doneAt: isoDateTimeSchema.nullable(),
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
  /** Schema d'URL des liens profonds (sans tiret). */
  urlScheme: z.string().regex(/^[a-z][a-z0-9]*$/, { error: 'Schéma d’URL invalide (minuscules et chiffres)' }),
  playStoreUrl: httpsUrlSchema.nullable(),
  iosStatus: enumSchema(STORE_PUBLICATION_STATUSES),
  androidStatus: enumSchema(STORE_PUBLICATION_STATUSES),
  iosRejectionReason: optionalText(500),
  androidRejectionReason: optionalText(500),
  onboardingChecklist: z.array(OnboardingStepSchema),
});
export type TenantStoreInfo = z.infer<typeof TenantStoreInfoSchema>;

export const TenantStoreInfoInputSchema = TenantStoreInfoSchema.omit(INPUT_OMIT);
export type TenantStoreInfoInput = z.infer<typeof TenantStoreInfoInputSchema>;

/** Etapes de l'onboarding store d'une commune, dans l'ordre. */
export const ONBOARDING_STEP_DEFS = [
  { key: 'duns', label: 'Numéro D-U-N-S obtenu' },
  { key: 'apple-account', label: 'Compte Apple Developer (organisation) créé' },
  { key: 'apple-fee-waiver', label: 'Demande d’exonération des frais envoyée' },
  { key: 'apple-delegation', label: 'Accès délégué à l’éditeur accordé (Apple)' },
  { key: 'google-account', label: 'Compte Google Play organisation créé' },
  { key: 'google-delegation', label: 'Accès délégué accordé (Google)' },
  { key: 'store-listing', label: 'Textes et captures de la fiche store validés par la mairie' },
  { key: 'privacy-policy', label: 'Politique de confidentialité en ligne' },
  { key: 'first-release', label: 'Première publication' },
] as const;

