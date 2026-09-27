import type { z } from 'zod';

export type DataErrorCode = 'forbidden' | 'aal2_required' | 'not_found' | 'validation' | 'conflict' | 'not_implemented' | 'unknown';

export class DataError extends Error {
  constructor(
    message: string,
    readonly code: DataErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Droit insuffisant sur une commune a laquelle l'utilisateur a acces. */
export class ForbiddenError extends DataError {
  constructor(message = "Vous n'avez pas les droits pour effectuer cette action", code: 'forbidden' | 'aal2_required' = 'forbidden') {
    super(message, code);
  }
}

/** Element absent, ou commune non autorisee (on ne revele pas son existence). */
export class NotFoundError extends DataError {
  constructor(message = 'Élément introuvable') {
    super(message, 'not_found');
  }
}

export type ValidationIssue = { path: string; message: string };

export class ValidationError extends DataError {
  constructor(
    message = 'Certaines informations sont invalides',
    readonly issues: ValidationIssue[] = [],
  ) {
    super(message, 'validation');
  }

  static fromZod(error: z.ZodError, message?: string): ValidationError {
    const issues = error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
    return new ValidationError(message ?? issues[0]?.message ?? 'Certaines informations sont invalides', issues);
  }

  /** Premier message par champ, pour les formulaires. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of this.issues) out[issue.path] ??= issue.message;
    return out;
  }
}

export class ConflictError extends DataError {
  constructor(message: string) {
    super(message, 'conflict');
  }
}

export class NotImplementedError extends DataError {
  constructor(message: string) {
    super(message, 'not_implemented');
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}
