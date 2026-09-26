import { z } from 'zod';

import { APP_ROLES, MODULES, PERMISSION_LEVELS } from '../enums';
import { PermissionMapSchema } from '../permissions';
import { baseEntityShape, emailSchema, enumSchema, idSchema, isoDateTimeSchema, requiredText } from './common';

export const MembershipSchema = z.object({
  ...baseEntityShape,
  userId: idSchema,
  role: enumSchema(APP_ROLES),
  invitedAt: isoDateTimeSchema.nullable(),
  acceptedAt: isoDateTimeSchema.nullable(),
  disabledAt: isoDateTimeSchema.nullable(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const MembershipPermissionSchema = z.object({
  ...baseEntityShape,
  membershipId: idSchema,
  module: enumSchema(MODULES),
  level: enumSchema(PERMISSION_LEVELS),
});
export type MembershipPermission = z.infer<typeof MembershipPermissionSchema>;

export const MemberInviteInputSchema = z.object({
  email: emailSchema,
  displayName: requiredText(100),
  role: enumSchema(APP_ROLES),
  permissions: PermissionMapSchema,
});
export type MemberInviteInput = z.infer<typeof MemberInviteInputSchema>;

export const MemberPermissionsInputSchema = z.object({
  role: enumSchema(APP_ROLES),
  permissions: PermissionMapSchema,
});
export type MemberPermissionsInput = z.infer<typeof MemberPermissionsInputSchema>;

export type MembershipStatus = 'invited' | 'active' | 'disabled';

export function membershipStatus(m: Pick<Membership, 'acceptedAt' | 'disabledAt'>): MembershipStatus {
  if (m.disabledAt) return 'disabled';
  return m.acceptedAt ? 'active' : 'invited';
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  invited: 'Invité',
  active: 'Actif',
  disabled: 'Désactivé',
};
