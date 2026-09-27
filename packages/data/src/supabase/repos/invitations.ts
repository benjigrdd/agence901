import type { AppRole, PermissionMap } from '@app/shared';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { Db } from '../core';

export type InvitationRequest = { tenantId: string; email: string; displayName: string; role: AppRole; permissions: PermissionMap };

/**
 * Invitation via l'Edge Function `invite-member` (seule a detenir la cle service). Le jeton de
 * l'appelant accompagne la requete : la fonction verifie ses droits avant tout.
 */
/** Appel d'une Edge Function avec le jeton de l'appelant ; erreurs `APP_…` traduites. */
export async function invokeFunction<T>(db: Db, name: string, body: object): Promise<T> {
  const { data, error } = await db.functions.invoke<T>(name, { body });
  if (error) {
    const context: unknown = 'context' in error ? error.context : null;
    const payload: unknown = context instanceof Response ? await context.json().catch(() => null) : null;
    const code = payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : '';
    const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'Opération impossible';
    if (code === 'APP_ALREADY_MEMBER') throw new ConflictError(message);
    if (code === 'APP_FORBIDDEN') throw new ForbiddenError(message);
    if (code === 'APP_NOT_FOUND') throw new NotFoundError(message);
    if (code === 'APP_BUSY') throw new ConflictError(message);
    throw new ValidationError(message);
  }
  if (data === null) throw new ValidationError('Opération impossible');
  return data;
}

export async function inviteMember(db: Db, request: InvitationRequest): Promise<{ membershipId: string; userId: string }> {
  const data = await invokeFunction<{ membershipId?: string; userId?: string }>(db, 'invite-member', request);
  if (!data.membershipId || !data.userId) throw new ValidationError('Invitation impossible');
  return { membershipId: data.membershipId, userId: data.userId };
}
