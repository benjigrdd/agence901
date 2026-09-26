import { z } from 'zod';

export const idSchema = z.uuid({ error: 'Identifiant invalide' });
export const isoDateTimeSchema = z.iso.datetime({ offset: true, error: 'Date et heure invalides' });
export const isoDateSchema = z.iso.date({ error: 'Date invalide (AAAA-MM-JJ)' });
export const httpsUrlSchema = z.url({ protocol: /^https$/, error: 'Adresse web en https requise' });
export const emailSchema = z.email({ error: 'Adresse email invalide' });
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+33\s?|0)[1-9](\s?\d{2}){4}$/, { error: 'Numéro de téléphone invalide' });
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Couleur au format #RRGGBB attendue' });
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Minuscules, chiffres et tirets uniquement' });

export function requiredText(max: number) {
  return z
    .string({ error: 'Ce champ est obligatoire' })
    .trim()
    .min(1, { error: 'Ce champ est obligatoire' })
    .max(max, { error: `${max} caractères maximum` });
}

export function optionalText(max: number) {
  return z.string().trim().max(max, { error: `${max} caractères maximum` }).nullable();
}

export function enumSchema<const T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, { error: 'Valeur non autorisée' });
}

/** Champs communs a toute entite metier. */
export const baseEntityShape = {
  id: idSchema,
  tenantId: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
};

/** Champs retires des schemas de saisie : fournis par le serveur ou le contexte. */
export const INPUT_OMIT = { id: true, tenantId: true, createdAt: true, updatedAt: true } as const;
