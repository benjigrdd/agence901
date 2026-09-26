import type { AuditAction } from '@app/shared';
import { computeAuditDiff } from '@app/shared';

import type { MockStore } from './store';

export type MockRuntime = {
  store: MockStore;
  now: () => Date;
  newId: () => string;
};

/** UUID v4 sans dependance a `crypto` (disponible partout, y compris Hermes). */
export function randomUuid(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else {
      const r = Math.floor(Math.random() * 16);
      out += hex.charAt(i === 19 ? (r & 0x3) | 0x8 : r);
    }
  }
  return out;
}

export function nowIso(rt: MockRuntime): string {
  return rt.now().toISOString();
}

function toRecord(value: object | null): Record<string, unknown> | null {
  return value === null ? null : Object.fromEntries(Object.entries(value));
}

export type AuditInput = {
  tenantId: string;
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: object | null;
  after: object | null;
};

/** Toute ecriture du personnel laisse une trace avec le diff avant/apres. */
export function recordAudit(rt: MockRuntime, input: AuditInput): void {
  rt.store.audit.set({
    id: rt.newId(),
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    diff: computeAuditDiff(toRecord(input.before), toRecord(input.after)),
    at: nowIso(rt),
  });
}
