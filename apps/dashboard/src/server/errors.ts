import 'server-only';

import { isDataError, ValidationError } from '@app/data';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Traduit une erreur de la couche de donnees en message francais pour l'interface. */
export function toActionError(error: unknown): { ok: false; message: string; fieldErrors?: Record<string, string> } {
  if (error instanceof ValidationError) {
    return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
  }
  if (isDataError(error)) {
    switch (error.code) {
      case 'forbidden':
      case 'conflict':
      case 'not_found':
        return { ok: false, message: error.message };
      case 'aal2_required':
        return { ok: false, message: 'Double authentification requise' };
      case 'not_implemented':
        return { ok: false, message: 'Fonctionnalité pas encore disponible' };
    }
  }
  // Pas de detail technique (ni donnees personnelles) cote interface.
  return { ok: false, message: 'Une erreur inattendue est survenue. Réessayez.' };
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Les interruptions Next (redirect, notFound, forbidden) doivent se propager.
    if (error instanceof Error && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_')) {
      throw error;
    }
    return toActionError(error);
  }
}
