import type { ContentStatus, PermissionLevel, ReportStatus } from './enums';
import { TERMINAL_REPORT_STATUSES } from './enums';
import type { Session } from './permissions';
import { can } from './permissions';

export type ContentModule = 'news' | 'events';

export type TransitionFailure =
  | 'forbidden'
  | 'not_allowed'
  | 'comment_required'
  | 'publish_at_required'
  | 'message_required'
  | 'duplicate_required';

export const TRANSITION_FAILURE_MESSAGES: Record<TransitionFailure, string> = {
  forbidden: "Vous n'avez pas les droits pour effectuer cette action",
  not_allowed: "Ce changement de statut n'est pas possible",
  comment_required: 'Un motif est obligatoire pour refuser',
  publish_at_required: 'La date de publication doit être dans le futur',
  message_required: 'Un motif est obligatoire pour rejeter un signalement',
  duplicate_required: "Choisissez le signalement d'origine",
};

export class WorkflowError extends Error {
  constructor(readonly reason: TransitionFailure) {
    super(TRANSITION_FAILURE_MESSAGES[reason]);
    this.name = 'WorkflowError';
  }
}

type TransitionResult = { ok: true } | { ok: false; reason: TransitionFailure };

// ---------------------------------------------------------------------------
// Contenus (actualites et evenements)
// ---------------------------------------------------------------------------

type ContentTransitionRule = {
  from: readonly ContentStatus[];
  to: ContentStatus;
  level: PermissionLevel;
  requiresComment?: boolean;
  requiresFuturePublishAt?: boolean;
};

export const CONTENT_TRANSITIONS: readonly ContentTransitionRule[] = [
  { from: ['draft'], to: 'pending_review', level: 'edit' },
  { from: ['pending_review'], to: 'draft', level: 'publish', requiresComment: true },
  { from: ['draft', 'pending_review'], to: 'scheduled', level: 'publish', requiresFuturePublishAt: true },
  { from: ['draft', 'pending_review'], to: 'published', level: 'publish' },
  { from: ['scheduled'], to: 'draft', level: 'publish' },
  { from: ['published'], to: 'archived', level: 'publish' },
];

export type ContentTransitionOptions = {
  comment?: string | null;
  publishAt?: string | null;
  now?: Date;
};

function findContentRule(from: ContentStatus, to: ContentStatus) {
  return CONTENT_TRANSITIONS.find((r) => r.to === to && r.from.includes(from));
}

export function checkContentTransition(
  session: Session | null,
  tenantId: string,
  module: ContentModule,
  from: ContentStatus,
  to: ContentStatus,
  options: ContentTransitionOptions = {},
): TransitionResult {
  const rule = findContentRule(from, to);
  if (!rule) return { ok: false, reason: 'not_allowed' };
  if (!can(session, tenantId, module, rule.level)) return { ok: false, reason: 'forbidden' };
  if (rule.requiresComment && !options.comment?.trim()) return { ok: false, reason: 'comment_required' };
  if (rule.requiresFuturePublishAt) {
    const now = options.now ?? new Date();
    if (!options.publishAt || Date.parse(options.publishAt) <= now.getTime()) {
      return { ok: false, reason: 'publish_at_required' };
    }
  }
  return { ok: true };
}

export function canTransition(
  session: Session | null,
  tenantId: string,
  module: ContentModule,
  from: ContentStatus,
  to: ContentStatus,
  options?: ContentTransitionOptions,
): boolean {
  return checkContentTransition(session, tenantId, module, from, to, options).ok;
}

export function assertTransition(
  session: Session | null,
  tenantId: string,
  module: ContentModule,
  from: ContentStatus,
  to: ContentStatus,
  options?: ContentTransitionOptions,
): void {
  const result = checkContentTransition(session, tenantId, module, from, to, options);
  if (!result.ok) throw new WorkflowError(result.reason);
}

/** Statuts cibles autorises par les droits (hors motif et date), pour la barre d'actions. */
export function allowedContentTransitions(
  session: Session | null,
  tenantId: string,
  module: ContentModule,
  from: ContentStatus,
): ContentStatus[] {
  return CONTENT_TRANSITIONS.filter(
    (r) => r.from.includes(from) && can(session, tenantId, module, r.level),
  ).map((r) => r.to);
}

/** Modifier le contenu : edition pour un brouillon ou en validation, publication sinon. */
export function canEditContent(
  session: Session | null,
  tenantId: string,
  module: ContentModule,
  status: ContentStatus,
): boolean {
  if (status === 'archived') return false;
  const level: PermissionLevel = status === 'draft' || status === 'pending_review' ? 'edit' : 'publish';
  return can(session, tenantId, module, level);
}

// ---------------------------------------------------------------------------
// Signalements
// ---------------------------------------------------------------------------

const REPORT_FLOW: Record<ReportStatus, readonly ReportStatus[]> = {
  new: ['acknowledged'],
  acknowledged: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['in_progress'],
  rejected: [],
  duplicate: [],
};

const TERMINAL: readonly ReportStatus[] = TERMINAL_REPORT_STATUSES;

export function isTerminalReportStatus(status: ReportStatus): boolean {
  return TERMINAL.includes(status);
}

export type ReportTransitionOptions = {
  message?: string | null;
  duplicateOfId?: string | null;
};

export function checkReportTransition(
  session: Session | null,
  tenantId: string,
  from: ReportStatus,
  to: ReportStatus,
  options: ReportTransitionOptions = {},
): TransitionResult {
  if (!can(session, tenantId, 'reports', 'edit')) return { ok: false, reason: 'forbidden' };
  if (to === 'rejected' || to === 'duplicate') {
    if (isTerminalReportStatus(from)) return { ok: false, reason: 'not_allowed' };
    if (to === 'rejected' && !options.message?.trim()) return { ok: false, reason: 'message_required' };
    if (to === 'duplicate' && !options.duplicateOfId) return { ok: false, reason: 'duplicate_required' };
    return { ok: true };
  }
  return REPORT_FLOW[from].includes(to) ? { ok: true } : { ok: false, reason: 'not_allowed' };
}

export function canTransitionReport(
  session: Session | null,
  tenantId: string,
  from: ReportStatus,
  to: ReportStatus,
  options?: ReportTransitionOptions,
): boolean {
  return checkReportTransition(session, tenantId, from, to, options).ok;
}

export function assertReportTransition(
  session: Session | null,
  tenantId: string,
  from: ReportStatus,
  to: ReportStatus,
  options?: ReportTransitionOptions,
): void {
  const result = checkReportTransition(session, tenantId, from, to, options);
  if (!result.ok) throw new WorkflowError(result.reason);
}

/** Statuts cibles proposes dans l'interface (hors motif et doublon). */
export function allowedReportTransitions(
  session: Session | null,
  tenantId: string,
  from: ReportStatus,
): ReportStatus[] {
  if (!can(session, tenantId, 'reports', 'edit')) return [];
  const next: ReportStatus[] = [...REPORT_FLOW[from]];
  if (!isTerminalReportStatus(from)) next.push('rejected', 'duplicate');
  return next;
}
