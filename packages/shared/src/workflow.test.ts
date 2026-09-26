import { describe, expect, it } from 'vitest';

import type { ContentStatus, ReportStatus } from './enums';
import { CONTENT_STATUSES, REPORT_STATUSES } from './enums';
import type { Session } from './permissions';
import {
  allowedContentTransitions,
  assertReportTransition,
  assertTransition,
  canEditContent,
  canTransition,
  canTransitionReport,
  checkContentTransition,
  checkReportTransition,
  WorkflowError,
} from './workflow';

const A = '00000000-0000-4000-8000-00000000000a';
const USER = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-09-26T10:00:00Z');
const FUTURE = '2026-10-12T06:00:00Z';
const PAST = '2026-09-01T06:00:00Z';

const admin: Session = {
  userId: USER,
  isPlatformAdmin: false,
  aal: 'aal2',
  memberships: [{ tenantId: A, role: 'admin', permissions: {} }],
};
const agent: Session = {
  userId: USER,
  isPlatformAdmin: false,
  aal: 'aal2',
  memberships: [{ tenantId: A, role: 'agent', permissions: { news: 'edit', reports: 'edit' } }],
};

const ALLOWED: Record<string, true> = {
  'draft>pending_review': true,
  'pending_review>draft': true,
  'draft>scheduled': true,
  'pending_review>scheduled': true,
  'draft>published': true,
  'pending_review>published': true,
  'scheduled>draft': true,
  'published>archived': true,
};

describe('transitions des contenus', () => {
  const pairs: [ContentStatus, ContentStatus][] = CONTENT_STATUSES.flatMap((from) =>
    CONTENT_STATUSES.map((to): [ContentStatus, ContentStatus] => [from, to]),
  );

  for (const [from, to] of pairs) {
    const allowed = ALLOWED[`${from}>${to}`] === true;
    it(`${from} -> ${to} : ${allowed ? 'autorisée' : 'interdite'} pour un admin`, () => {
      const result = checkContentTransition(admin, A, 'news', from, to, {
        comment: 'Motif',
        publishAt: FUTURE,
        now: NOW,
      });
      expect(result.ok).toBe(allowed);
      if (!allowed) expect(result).toEqual({ ok: false, reason: 'not_allowed' });
    });
  }

  it("l'agent (édition) peut soumettre mais ni publier ni programmer", () => {
    expect(canTransition(agent, A, 'news', 'draft', 'pending_review')).toBe(true);
    expect(checkContentTransition(agent, A, 'news', 'draft', 'published')).toEqual({ ok: false, reason: 'forbidden' });
    expect(canTransition(agent, A, 'news', 'draft', 'scheduled', { publishAt: FUTURE, now: NOW })).toBe(false);
    expect(allowedContentTransitions(agent, A, 'news', 'draft')).toEqual(['pending_review']);
  });

  it('le refus exige un motif', () => {
    expect(checkContentTransition(admin, A, 'news', 'pending_review', 'draft', { comment: '  ' })).toEqual({
      ok: false,
      reason: 'comment_required',
    });
    expect(() => assertTransition(admin, A, 'news', 'pending_review', 'draft')).toThrow(WorkflowError);
  });

  it('la programmation exige une date future', () => {
    expect(checkContentTransition(admin, A, 'news', 'draft', 'scheduled', { publishAt: PAST, now: NOW })).toEqual({
      ok: false,
      reason: 'publish_at_required',
    });
    expect(canTransition(admin, A, 'news', 'draft', 'scheduled', { publishAt: FUTURE, now: NOW })).toBe(true);
  });

  it('modification : édition sur brouillon, publication sur contenu publié', () => {
    expect(canEditContent(agent, A, 'news', 'draft')).toBe(true);
    expect(canEditContent(agent, A, 'news', 'published')).toBe(false);
    expect(canEditContent(admin, A, 'news', 'published')).toBe(true);
    expect(canEditContent(admin, A, 'news', 'archived')).toBe(false);
  });
});

describe('transitions des signalements', () => {
  const FLOW: Record<string, true> = {
    'new>acknowledged': true,
    'acknowledged>in_progress': true,
    'in_progress>resolved': true,
    'resolved>in_progress': true,
  };
  const TERMINAL: ReportStatus[] = ['resolved', 'rejected', 'duplicate'];

  for (const from of REPORT_STATUSES) {
    for (const to of REPORT_STATUSES) {
      const special = to === 'rejected' || to === 'duplicate';
      const allowed = special ? !TERMINAL.includes(from) : FLOW[`${from}>${to}`] === true;
      it(`${from} -> ${to} : ${allowed ? 'autorisée' : 'interdite'}`, () => {
        expect(
          canTransitionReport(agent, A, from, to, { message: 'Motif', duplicateOfId: USER }),
        ).toBe(allowed);
      });
    }
  }

  it('le rejet exige un motif et le doublon exige un original', () => {
    expect(checkReportTransition(agent, A, 'new', 'rejected')).toEqual({ ok: false, reason: 'message_required' });
    expect(checkReportTransition(agent, A, 'new', 'duplicate')).toEqual({ ok: false, reason: 'duplicate_required' });
    expect(() => assertReportTransition(agent, A, 'new', 'rejected', { message: '' })).toThrow(WorkflowError);
  });

  it('refuse sans droit d’édition sur les signalements', () => {
    expect(checkReportTransition(null, A, 'new', 'acknowledged')).toEqual({ ok: false, reason: 'forbidden' });
  });
});
