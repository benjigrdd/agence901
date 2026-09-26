import { z } from 'zod';

import { NOTIFICATION_TARGET_TYPES, REVIEWABLE_ENTITY_TYPES } from '../enums';
import { baseEntityShape, enumSchema, idSchema, isoDateTimeSchema, optionalText, requiredText } from './common';

export const NotificationTargetSchema = z
  .object({ type: enumSchema(NOTIFICATION_TARGET_TYPES), ids: z.array(idSchema) })
  .superRefine((t, ctx) => {
    if (t.type !== 'all' && t.ids.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['ids'], message: 'Sélectionnez au moins un élément' });
    }
    if (t.type === 'all' && t.ids.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['ids'], message: 'Aucune sélection pour toute la commune' });
    }
  });
export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;

export const LinkedEntitySchema = z.object({ type: enumSchema(REVIEWABLE_ENTITY_TYPES), id: idSchema });
export type LinkedEntity = z.infer<typeof LinkedEntitySchema>;

export const NotificationSchema = z.object({
  ...baseEntityShape,
  title: requiredText(50),
  body: requiredText(150),
  target: NotificationTargetSchema,
  linkedEntity: LinkedEntitySchema.nullable(),
  scheduledAt: isoDateTimeSchema.nullable(),
  sentAt: isoDateTimeSchema.nullable(),
  stats: z.object({ recipients: z.number().int().min(0), opened: z.number().int().min(0) }),
  /** Les notifications urgentes echappent a la regle anti-lassitude. */
  urgent: z.boolean(),
  /** Justification exigee au-dela du quota quotidien de notifications non urgentes. */
  justification: optionalText(300),
  authorId: idSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationInputSchema = z.object({
  title: NotificationSchema.shape.title,
  body: NotificationSchema.shape.body,
  target: NotificationTargetSchema,
  linkedEntity: LinkedEntitySchema.nullable(),
  scheduledAt: isoDateTimeSchema.nullable(),
  urgent: z.boolean(),
  justification: optionalText(300),
});
export type NotificationInput = z.infer<typeof NotificationInputSchema>;
