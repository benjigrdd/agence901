import { PERSONA_SESSIONS, TENANT_IDS } from '@app/data';
import type { Session } from '@app/shared';
import { TENANT_MODULES, V2_MODULES } from '@app/shared';
import { describe, expect, it } from 'vitest';

import { activeItems, buildNavigation } from './navigation';

const v2: readonly string[] = V2_MODULES;
const ALL_V1 = TENANT_MODULES.filter((m) => !v2.includes(m));
const labels = (session: Session | null, tenantId: string, modules: readonly string[] = ALL_V1) =>
  activeItems(buildNavigation(session, tenantId, modules)).map((i) => i.label);

describe('buildNavigation', () => {
  it("agent-alpha voit Accueil, Actualités, Agenda, Médiathèque et Signalements seulement", () => {
    expect(labels(PERSONA_SESSIONS['agent-alpha'], TENANT_IDS.alpha)).toEqual([
      'Accueil',
      'Actualités',
      'Agenda',
      'Médiathèque',
      'Signalements',
    ]);
  });

  it("l'admin voit tous les modules V1 de sa commune", () => {
    expect(labels(PERSONA_SESSIONS['admin-alpha'], TENANT_IDS.alpha)).toEqual([
      'Accueil',
      'Actualités',
      'Agenda',
      'Médiathèque',
      'Signalements',
      'Carte',
      'Environnement',
      'Démarches',
      'Notifications',
      'Quartiers',
      'Paramètres',
      "Journal d'audit",
    ]);
  });

  it('masque un module désactivé pour la commune, même pour un admin', () => {
    const modules = ALL_V1.filter((m) => m !== 'reports' && m !== 'environment');
    const result = labels(PERSONA_SESSIONS['admin-alpha'], TENANT_IDS.alpha, modules);
    expect(result).not.toContain('Signalements');
    expect(result).not.toContain('Environnement');
    expect(result).toContain('Médiathèque');
  });

  it('ne montre que l’accueil sur une commune sans droit', () => {
    expect(labels(PERSONA_SESSIONS['admin-alpha'], TENANT_IDS.beta)).toEqual(['Accueil']);
  });

  it('ne montre que l’accueil sans double authentification', () => {
    expect(labels(PERSONA_SESSIONS['staff-aal1'], TENANT_IDS.alpha)).toEqual(['Accueil']);
  });

  it('donne tout au super-admin, sur toutes les communes', () => {
    expect(labels(PERSONA_SESSIONS['platform-admin'], TENANT_IDS.beta)).toHaveLength(12);
  });

  it('annonce les modules V2 grisés, jamais cliquables', () => {
    const groups = buildNavigation(PERSONA_SESSIONS['admin-alpha'], TENANT_IDS.alpha, ALL_V1);
    const soon = groups.flatMap((g) => g.items.filter((i) => i.soon)).map((i) => i.label);
    expect(soon).toEqual(['Mobilité', 'Services pratiques', 'Participation']);
    expect(activeItems(groups).some((i) => i.soon)).toBe(false);
  });

  it('retire un groupe vide et ne montre pas le journal d’audit à un agent', () => {
    const groups = buildNavigation(PERSONA_SESSIONS['agent-alpha'], TENANT_IDS.alpha, ALL_V1);
    expect(groups.map((g) => g.label)).toEqual(['Pilotage', 'Contenus', 'Services aux habitants']);
  });
});
