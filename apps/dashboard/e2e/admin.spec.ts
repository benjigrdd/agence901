import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

async function openTenant(page: Page, name: string, tab = '') {
  await page.goto('/admin/communes');
  await page.getByRole('link', { name, exact: true }).click();
  await page.waitForURL(/\/admin\/communes\/[0-9a-f-]{36}$/);
  if (tab) await page.getByRole('navigation', { name: 'Sections de la fiche commune' }).getByRole('link', { name: tab, exact: true }).click();
}

test.describe('espace super-admin', () => {
  test('un administrateur de commune obtient une 404 sur /admin', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    expect((await page.goto('/admin'))?.status()).toBe(404);
    expect((await page.goto('/admin/usage'))?.status()).toBe(404);
  });

  test('assistant complet : une nouvelle commune apparaît avec sa marque et ses données par défaut', async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await page.goto('/admin/communes/nouvelle');
    await expectNoSeriousA11yViolations(page);
    const suffix = String(Date.now() % 100000);
    const name = `Commune Démo Gamma ${suffix}`;
    const slug = `commune-demo-gamma-${suffix}`;

    await expect(page.getByRole('heading', { name: 'Étape 1 sur 5 : Identité' })).toBeFocused();
    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill(name);
    await expect(page.getByLabel('Identifiant d’URL')).toHaveValue(slug);
    await page.getByLabel('Code INSEE').fill('99003');
    await page.getByLabel('Population').fill('8400');
    await page.getByLabel('Latitude du centre').fill('45.76');
    await page.getByLabel('Longitude du centre').fill('4.83');
    await page.getByRole('button', { name: 'Suivant' }).click();

    await expect(page.getByRole('heading', { name: 'Étape 2 sur 5 : Marque' })).toBeVisible();
    await page.getByLabel('Nom de l’application').fill('Ma ville Gamma');
    await page.getByLabel('Nom court (sous l’icône)').fill('Gamma');
    await page.getByRole('textbox', { name: 'Texte sur primaire', exact: true }).fill('#8fa3c0');
    await expect(page.getByText(/Texte sur couleur primaire : \d+,\d{2}:1 : insuffisant, 4,50:1 attendu/)).toBeVisible();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByText('Corrigez la marque')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Étape 2 sur 5 : Marque' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Texte sur primaire', exact: true }).fill('#FFFFFF');
    // L'apercu reproduit volontairement une palette invalide : on verifie l'accessibilite une fois corrigee.
    await expectNoSeriousA11yViolations(page);
    await page.getByRole('button', { name: 'Suivant' }).click();

    await expect(page.getByRole('heading', { name: 'Étape 3 sur 5 : Modules' })).toBeVisible();
    await expect(page.getByRole('switch', { name: /Participation/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Suivant' }).click();

    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Maire Gamma');
    await page.getByLabel('Email').fill(`maire-${suffix}@demo-gamma.test`);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByRole('heading', { name: 'Étape 5 sur 5 : Récapitulatif' })).toBeVisible();
    await page.getByRole('button', { name: 'Précédent' }).click();
    await expect(page.getByRole('textbox', { name: 'Nom', exact: true })).toHaveValue('Maire Gamma');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Créer la commune' }).click();

    await page.waitForURL(/\/admin\/communes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.goto('/admin/communes');
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();

    await page.goto(`/${slug}/carte/categories`);
    await expect(page.getByRole('table', { name: 'Catégories de lieux' }).getByRole('row')).toHaveCount(13);
    await expect(page.getByRole('status').filter({ hasText: 'en tant qu’éditeur' })).toBeVisible();
    await page.goto(`/${slug}/parametres/membres`);
    await expect(page.getByRole('row', { name: /Maire Gamma/ })).toContainText('Invité');
  });

  test('désactiver l’Agenda le retire de la navigation de la commune', async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await openTenant(page, 'Commune Démo Alpha', 'Modules');
    const agenda = page.getByRole('switch', { name: 'Agenda' });
    await agenda.click();
    await expect(page.getByText('Agenda désactivé')).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Actualités' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Agenda' })).toHaveCount(0);

    await loginAs(page, 'Éditeur (super-admin)');
    await openTenant(page, 'Commune Démo Alpha', 'Modules');
    await page.getByRole('switch', { name: 'Agenda' }).click();
    await expect(page.getByText('Agenda activé')).toBeVisible();
  });

  test('suspendre puis réactiver une commune', async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await openTenant(page, 'Commune Démo Bêta', 'Zone sensible');
    const suspend = page.getByRole('button', { name: 'Suspendre la commune' });
    await expect(suspend).toBeDisabled();
    await page.getByLabel(/Pour confirmer/).fill('demo-beta');
    await suspend.click();
    await expect(page.getByText('Commune suspendue')).toBeVisible();

    await loginAs(page, 'Administrateur Bêta');
    await page.goto('/demo-beta');
    await expect(page).toHaveURL('/espace-suspendu');
    await expect(page.getByRole('heading', { name: 'Espace suspendu' })).toBeVisible();
    await expect(page.getByText('Contactez votre éditeur')).toBeVisible();

    await loginAs(page, 'Éditeur (super-admin)');
    await openTenant(page, 'Commune Démo Bêta', 'Zone sensible');
    await page.getByLabel(/Pour confirmer/).fill('demo-beta');
    await page.getByRole('button', { name: 'Réactiver la commune' }).click();
    await expect(page.getByText('Commune réactivée')).toBeVisible();
    await loginAs(page, 'Administrateur Bêta');
    expect((await page.goto('/demo-beta'))?.status()).toBe(200);
  });

  test('chaque accès de l’éditeur est tracé dans l’audit de la commune', async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await page.goto('/demo-alpha/actualites');
    await page.goto('/demo-alpha/audit?action=platform_access');
    await expect(page.getByRole('table')).toContainText('Accès éditeur');
  });

  test('accessibilité : liste, fiche (onglets), usage', async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await page.goto('/admin/communes');
    await expectNoSeriousA11yViolations(page);
    for (const tab of ['Marque', 'Membres', 'Stores', 'Usage']) {
      await openTenant(page, 'Commune Démo Alpha', tab);
      await expectNoSeriousA11yViolations(page);
    }
    await page.goto('/admin/usage');
    await expect(page.getByRole('table')).toContainText('Commune Démo Alpha');
    await expectNoSeriousA11yViolations(page);
    const csv = await page.request.get('/admin/usage/export?periode=90');
    expect(await csv.text()).toContain('Commune;Installations');
  });
});
