import { z } from 'zod';

import { REVIEW_ACTIONS, REVIEWABLE_ENTITY_TYPES } from '../enums';
import { baseEntityShape, enumSchema, idSchema, optionalText } from './common';

export const ContentReviewSchema = z
  .object({
    ...baseEntityShape,
    entityType: enumSchema(REVIEWABLE_ENTITY_TYPES),
    entityId: idSchema,
    action: enumSchema(REVIEW_ACTIONS),
    comment: optionalText(1000),
    authorId: idSchema,
  })
  .superRefine((r, ctx) => {
    if (r.action === 'rejected' && !r.comment) {
      ctx.addIssue({ code: 'custom', path: ['comment'], message: 'Un motif est obligatoire pour refuser' });
    }
  });
export type ContentReview = z.infer<typeof ContentReviewSchema>;
