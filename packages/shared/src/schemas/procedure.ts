import { z } from 'zod';

import type { ProcedureKind } from '../enums';
import { PROCEDURE_CATEGORIES, PROCEDURE_KINDS } from '../enums';
import {
  baseEntityShape,
  emailSchema,
  enumSchema,
  httpsUrlSchema,
  INPUT_OMIT,
  phoneSchema,
  requiredText,
} from './common';

const procedureShape = {
  ...baseEntityShape,
  category: enumSchema(PROCEDURE_CATEGORIES),
  title: requiredText(120),
  description: requiredText(300),
  kind: enumSchema(PROCEDURE_KINDS),
  /** URL https, numero de telephone ou adresse email selon `kind`. */
  value: requiredText(500),
  order: z.number().int().min(0),
};

const VALUE_SCHEMAS: Record<ProcedureKind, z.ZodType<string>> = {
  link: httpsUrlSchema,
  phone: phoneSchema,
  email: emailSchema,
};

function checkValue(p: { kind: ProcedureKind; value: string }, ctx: z.RefinementCtx) {
  const result = VALUE_SCHEMAS[p.kind].safeParse(p.value);
  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: result.error.issues[0]?.message ?? 'Valeur invalide',
    });
  }
}

export const ProcedureSchema = z.object(procedureShape).superRefine(checkValue);
export type Procedure = z.infer<typeof ProcedureSchema>;

export const ProcedureInputSchema = z.object(procedureShape).omit(INPUT_OMIT).superRefine(checkValue);
export type ProcedureInput = z.infer<typeof ProcedureInputSchema>;
