import type { AppRole, PermissionMap } from '@app/shared';

import { ConflictError, ForbiddenError, ValidationError } from '../../errors';
import type { Db } from '../core';

export type InvitationRequest = { tenantId: string; email: string; displayName: string; role: AppRole; permissions: PermissionMap };

/**
 * Invitation via l'Edge Function `invite-member` (seule a detenir la cle service). Le jeton de
 * l'appelant accompagne la requete : la fonction verifie ses droits avant tout.
 */
export async function inviteMember(db: Db, request: InvitationRequest): Promise<{ membershipId: string; userId: string }> {
  const { data, error } = await db.functions.invoke<{ membershipId?: string; userId?: string; code?: string; error?: string }>('invite-member', { body: request });
  if (error) {
    const context: unknown = 'context' in error ? error.context : null;
    const payload = context instanceof Response ? await context.json().catch(() => null) : null;
    const code = payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : '';
    const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'Invitation impossible';
    if (code === 'APP_ALREADY_MEMBER') throw new ConflictError(message);
    if (code === 'APP_FORBIDDEN') throw new ForbiddenError(message);
    throw new ValidationError(message);
  }
  if (!data?.membershipId || !data.userId) throw new ValidationError('Invitation impossible');
  return { membershipId: data.membershipId, userId: data.userId };
}
