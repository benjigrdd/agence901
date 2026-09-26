import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

test.describe('coque du dashboard', () => {
  test('changer de persona met à jour la navigation', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    await expect(page).toHaveURL('/demo-alpha');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    const links = await nav.getByRole('link').allTextContents();
    expect(links.map((l) => l.trim())).toEqual(['Accueil', 'Actualités', 'Agenda', 'Médiathèque', 'Signalements']);

    await loginAs(page, 'Administrateur Alpha');
    await expect(nav.getByRole('link', { name: 'Carte' })).toBeVisible();
    await expect(nav.getByRole('link', { name: "Journal d'audit" })).toBeVisible();
  });

  test('une autre commune renvoie une 404, un module non autorisé une 403', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    const other = await page.goto('/demo-beta');
    expect(other?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
    await expect(page.getByText('Commune Démo Bêta')).toHaveCount(0);

    const forbidden = await page.goto('/demo-alpha/notifications');
    expect(forbidden?.status()).toBe(403);
    await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();
  });

  test("le super-admin arrive sur /admin et voit le bandeau éditeur", async ({ page }) => {
    await loginAs(page, 'Éditeur (super-admin)');
    await expect(page).toHaveURL('/admin/communes');
    await page.goto('/demo-alpha');
    await expect(page.getByRole('status')).toContainText('en tant qu’éditeur');
  });

  test('sans double authentification, retour à la connexion', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByRole('button', { name: 'Se connecter en tant que Admin Alpha sans 2FA' }).click();
    await expect(page).toHaveURL('/connexion?erreur=2fa');
    // Next ajoute son propre annonceur de route (role="alert") : on cible le message.
    await expect(page.getByRole('alert').filter({ hasText: 'Double authentification requise' })).toBeVisible();
  });

  test('le lien d’évitement mène au contenu principal', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Aller au contenu principal' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contenu')).toBeFocused();
  });

  test('accessibilité : connexion, accueil commune, liste des communes', async ({ page }) => {
    await page.goto('/connexion');
    await expectNoSeriousA11yViolations(page);
    await loginAs(page, 'Administrateur Alpha');
    await expectNoSeriousA11yViolations(page);
    await loginAs(page, 'Éditeur (super-admin)');
    await page.goto('/admin/communes');
    await expectNoSeriousA11yViolations(page);
  });
});
