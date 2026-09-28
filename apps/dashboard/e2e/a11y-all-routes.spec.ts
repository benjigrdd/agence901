import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

/**
 * RGAA : axe sur TOUTES les routes du dashboard, pour les trois profils (admin et agent d'une commune,
 * editeur). Zero violation « serious » ou « critical ». Les routes interdites a un profil sont
 * controlees telles qu'il les voit (page 403 ou 404).
 */
const T = '/demo-alpha';

const TENANT_ROUTES = [
  T,
  `${T}/actualites`,
  `${T}/actualites/nouveau`,
  `${T}/agenda`,
  `${T}/agenda?vue=calendrier`,
  `${T}/agenda/nouveau`,
  `${T}/audit`,
  `${T}/carte`,
  `${T}/carte?vue=carte`,
  `${T}/carte/categories`,
  `${T}/carte/nouveau`,
  `${T}/demarches`,
  `${T}/environnement`,
  `${T}/mediatheque`,
  `${T}/notifications`,
  `${T}/parametres`,
  `${T}/parametres/commune`,
  `${T}/parametres/membres`,
  `${T}/parametres/services`,
  `${T}/parametres/thematiques`,
  `${T}/quartiers`,
  `${T}/signalements`,
  `${T}/signalements?vue=carte`,
  '/compte/securite',
  '/choisir-commune',
];
const ADMIN_ROUTES = ['/admin', '/admin/communes', '/admin/communes/nouvelle', '/admin/usage'];

/** Premiere fiche d'une liste (identifiants generes par les donnees de demonstration). */
async function firstDetail(page: Page, list: string, pattern: RegExp): Promise<string | null> {
  await page.goto(list);
  const hrefs = await page.locator('a[href]').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
  return hrefs.find((h) => pattern.test(h)) ?? null;
}

async function check(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), `${route} : pas d'erreur serveur`).toBeLessThan(500);
  await expect(page.locator('h1').first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const PROFILES = [
  { persona: 'Administrateur Alpha', routes: [...TENANT_ROUTES, ...ADMIN_ROUTES], details: 4 },
  // Agent : pas d'acces a tous les modules (fiches des modules autorises seulement).
  { persona: 'Agent Alpha', routes: [...TENANT_ROUTES, '/admin'], details: 3 },
  { persona: 'Éditeur (super-admin)', routes: [...ADMIN_ROUTES, ...TENANT_ROUTES], details: 5 },
];

test.describe('accessibilité de toutes les routes (axe)', () => {
  test.describe.configure({ timeout: 240_000 });

  test('pages publiques', async ({ page }) => {
    for (const route of ['/connexion', '/mot-de-passe-oublie', '/espace-suspendu', '/403']) await check(page, route);
  });

  for (const { persona, routes, details } of PROFILES) {
    test(persona, async ({ page }) => {
      const cspViolations: string[] = [];
      page.on('console', (m) => {
        if (/Content[- ]Security[- ]Policy|Refused to (load|execute|connect|apply)/i.test(m.text())) cspViolations.push(m.text());
      });
      await loginAs(page, persona);
      const found = [
        await firstDetail(page, `${T}/actualites`, new RegExp(`^${T}/actualites/${UUID}$`)),
        await firstDetail(page, `${T}/agenda?vue=liste`, new RegExp(`^${T}/agenda/${UUID}$`)),
        await firstDetail(page, `${T}/carte`, new RegExp(`^${T}/carte/${UUID}$`)),
        await firstDetail(page, `${T}/signalements`, new RegExp(`^${T}/signalements/${UUID}$`)),
        persona === 'Éditeur (super-admin)' ? await firstDetail(page, '/admin/communes', new RegExp(`^/admin/communes/${UUID}$`)) : null,
      ].filter((h): h is string => h !== null);
      expect(found.length, 'fiches de detail trouvees').toBeGreaterThanOrEqual(details);
      for (const route of [...routes, ...found]) await check(page, route);
      // CSP : aucune violation sur l'ensemble du parcours (console vide).
      expect(cspViolations).toEqual([]);
    });
  }
});
