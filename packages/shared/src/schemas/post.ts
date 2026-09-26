import { z } from 'zod';

import type { AlertLevel, PostType } from '../enums';
import { ALERT_LEVELS, CONTENT_STATUSES, POST_TYPES } from '../enums';
import { baseEntityShape, enumSchema, idSchema, INPUT_OMIT, isoDateTimeSchema, requiredText } from './common';
import { RichTextDocSchema } from './rich-text';

const postShape = {
  ...baseEntityShape,
  type: enumSchema(POST_TYPES),
  title: requiredText(120),
  summary: requiredText(280),
  body: RichTextDocSchema,
  coverMediaId: idSchema.nullable(),
  status: enumSchema(CONTENT_STATUSES),
  publishAt: isoDateTimeSchema.nullable(),
  unpublishAt: isoDateTimeSchema.nullable(),
  districtIds: z.array(idSchema),
  topicIds: z.array(idSchema),
  pinned: z.boolean(),
  alertLevel: enumSchema(ALERT_LEVELS).nullable(),
  sendPush: z.boolean(),
  authorId: idSchema,
  reviewerId: idSchema.nullable(),
};

type PostRuleFields = {
  type: PostType;
  alertLevel: AlertLevel | null;
  publishAt: string | null;
  unpublishAt: string | null;
};

function checkPost(p: PostRuleFields, ctx: z.RefinementCtx) {
  if (p.type === 'alert' && !p.alertLevel) {
    ctx.addIssue({ code: 'custom', path: ['alertLevel'], message: "Le niveau d'alerte est obligatoire" });
  }
  if (p.type !== 'alert' && p.alertLevel) {
    ctx.addIssue({ code: 'custom', path: ['alertLevel'], message: 'Le niveau est réservé aux alertes' });
  }
  if (p.publishAt && p.unpublishAt && Date.parse(p.unpublishAt) <= Date.parse(p.publishAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['unpublishAt'],
      message: 'La dépublication doit suivre la publication',
    });
  }
}

export const PostSchema = z.object(postShape).superRefine(checkPost);
export type Post = z.infer<typeof PostSchema>;

export const PostInputSchema = z
  .object(postShape)
  .omit({ ...INPUT_OMIT, status: true, authorId: true, reviewerId: true })
  .superRefine(checkPost);
export type PostInput = z.infer<typeof PostInputSchema>;
