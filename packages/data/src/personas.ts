import type { AalLevel, Session } from '@app/shared';

const fixedId = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

export const TENANT_IDS = {
  alpha: fixedId(0xa1),
  beta: fixedId(0xb2),
} as const;

export const TENANT_SLUGS = { alpha: 'demo-alpha', beta: 'demo-beta' } as const;

export const USER_IDS = {
  platformAdmin: fixedId(0x1001),
  adminAlpha: fixedId(0x1002),
  agentAlpha: fixedId(0x1003),
  adminBeta: fixedId(0x1004),
  citizenAlpha: fixedId(0x1005),
  staffAal1: fixedId(0x1006),
} as const;

export const PERSONA_KEYS = [
  'platform-admin',
  'admin-alpha',
  'agent-alpha',
  'admin-beta',
  'citizen-alpha',
  'staff-aal1',
] as const;
export type PersonaKey = (typeof PERSONA_KEYS)[number];

export type Persona = {
  key: PersonaKey;
  userId: string;
  aal: AalLevel;
  kind: 'staff' | 'citizen';
  label: string;
  description: string;
};

export const PERSONAS: Record<PersonaKey, Persona> = {
  'platform-admin': {
    key: 'platform-admin',
    userId: USER_IDS.platformAdmin,
    aal: 'aal2',
    kind: 'staff',
    label: 'Éditeur (super-admin)',
    description: 'Tous les droits sur toutes les communes.',
  },
  'admin-alpha': {
    key: 'admin-alpha',
    userId: USER_IDS.adminAlpha,
    aal: 'aal2',
    kind: 'staff',
    label: 'Administrateur Alpha',
    description: 'Tous les droits sur la Commune Démo Alpha.',
  },
  'agent-alpha': {
    key: 'agent-alpha',
    userId: USER_IDS.agentAlpha,
    aal: 'aal2',
    kind: 'staff',
    label: 'Agent Alpha',
    description: 'Actualités : édition · Agenda : publication · Signalements : édition · Médiathèque : édition.',
  },
  'admin-beta': {
    key: 'admin-beta',
    userId: USER_IDS.adminBeta,
    aal: 'aal2',
    kind: 'staff',
    label: 'Administrateur Bêta',
    description: 'Tous les droits sur la Commune Démo Bêta.',
  },
  'citizen-alpha': {
    key: 'citizen-alpha',
    userId: USER_IDS.citizenAlpha,
    aal: 'aal1',
    kind: 'citizen',
    label: 'Habitant Alpha',
    description: "Compte anonyme de l'app citoyenne d'Alpha.",
  },
  'staff-aal1': {
    key: 'staff-aal1',
    userId: USER_IDS.staffAal1,
    aal: 'aal1',
    kind: 'staff',
    label: 'Admin Alpha sans 2FA',
    description: 'Administrateur Alpha dont la double authentification n’est pas validée.',
  },
};

/** Sessions correspondant aux fixtures initiales (tests et contrats). */
export const PERSONA_SESSIONS: Record<PersonaKey, Session> = {
  'platform-admin': { userId: USER_IDS.platformAdmin, isPlatformAdmin: true, aal: 'aal2', memberships: [] },
  'admin-alpha': {
    userId: USER_IDS.adminAlpha,
    isPlatformAdmin: false,
    aal: 'aal2',
    memberships: [{ tenantId: TENANT_IDS.alpha, role: 'admin', permissions: {} }],
  },
  'agent-alpha': {
    userId: USER_IDS.agentAlpha,
    isPlatformAdmin: false,
    aal: 'aal2',
    memberships: [
      {
        tenantId: TENANT_IDS.alpha,
        role: 'agent',
        permissions: { news: 'edit', events: 'publish', reports: 'edit', media: 'edit' },
      },
    ],
  },
  'admin-beta': {
    userId: USER_IDS.adminBeta,
    isPlatformAdmin: false,
    aal: 'aal2',
    memberships: [{ tenantId: TENANT_IDS.beta, role: 'admin', permissions: {} }],
  },
  'citizen-alpha': { userId: USER_IDS.citizenAlpha, isPlatformAdmin: false, aal: 'aal1', memberships: [] },
  'staff-aal1': {
    userId: USER_IDS.staffAal1,
    isPlatformAdmin: false,
    aal: 'aal1',
    memberships: [{ tenantId: TENANT_IDS.alpha, role: 'admin', permissions: {} }],
  },
};

export function isPersonaKey(value: string): value is PersonaKey {
  return (PERSONA_KEYS as readonly string[]).includes(value);
}
