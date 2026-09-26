import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

// PNG 1x1 valide pour le televersement.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test.describe('actualités : circuit de validation', () => {
  test('agent soumet → admin refuse → agent corrige → admin publie', async ({ page }) => {
    const title = `Travaux de voirie ${Date.now()}`;

    await loginAs(page, 'Agent Alpha');
    await page.goto('/demo-alpha/actualites/nouveau');
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(title);
    await page.getByLabel('Résumé').fill('Circulation perturbée rue des Écoles.');
    await expect(page.getByRole('button', { name: 'Publier maintenant' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Programmer' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Soumettre à validation' }).click();
    await expect(page.getByText('À valider').first()).toBeVisible();
    const postUrl = page.url();
    expect(postUrl).toMatch(/\/demo-alpha\/actualites\/[0-9a-f-]{36}$/);

    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/actualites?onglet=a-valider');
    await expect(page.getByRole('link', { name: /À valider \d+ éléments?/ })).toBeVisible();
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('button', { name: 'Refuser' }).click();
    await page.getByRole('button', { name: 'Confirmer le refus' }).click();
    await expect(page.getByText('Un motif est obligatoire pour refuser')).toBeVisible();
    await page.getByLabel('Motif du refus').fill('Précisez la durée des travaux.');
    await page.getByRole('button', { name: 'Confirmer le refus' }).click();
    await expect(page.getByText('Brouillon').first()).toBeVisible();

    await loginAs(page, 'Agent Alpha');
    await page.goto(postUrl);
    const history = page.getByRole('region', { name: 'Historique de validation' });
    await expect(history).toContainText('Refusé');
    await expect(history).toContainText('Précisez la durée des travaux.');
    await page.getByLabel('Résumé').fill('Circulation perturbée rue des Écoles pendant deux semaines.');
    await page.getByRole('button', { name: 'Soumettre à validation' }).click();
    await expect(page.getByText('À valider').first()).toBeVisible();

    await loginAs(page, 'Administrateur Alpha');
    await page.goto(postUrl);
    await page.getByRole('button', { name: 'Publier maintenant' }).click();
    await expect(page.getByText('Publié').first()).toBeVisible();
  });

  test('programmation affichée en toutes lettres', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/actualites/nouveau');
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(`Conseil municipal ${Date.now()}`);
    await page.getByLabel('Résumé').fill('Séance publique.');
    await page.getByRole('button', { name: 'Programmer' }).click();
    const year = new Date().getFullYear() + 1;
    await page.getByLabel('Date et heure de publication').fill(`${year}-10-12T08:00`);
    await page.getByRole('dialog').getByRole('button', { name: 'Programmer' }).click();
    await expect(page.getByText(/Programmée le 12 octobre( \d{4})? à 8 h 00/).first()).toBeVisible();
  });

  test('l’aperçu mobile reprend les couleurs de chaque commune', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/actualites/nouveau');
    const alpha = await page.getByTestId('apercu-mobile').getAttribute('data-primary');
    await loginAs(page, 'Administrateur Bêta');
    await page.goto('/demo-beta/actualites/nouveau');
    const beta = await page.getByTestId('apercu-mobile').getAttribute('data-primary');
    expect(alpha).toBe('#1d4e89');
    expect(beta).toBe('#1f6b45');
  });

  test('accessibilité : liste et éditeur', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/actualites');
    await expectNoSeriousA11yViolations(page);
    await page.goto('/demo-alpha/actualites/nouveau');
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('médiathèque et agenda', () => {
  test('une image sans texte alternatif est refusée, sauf si décorative', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    await page.goto('/demo-alpha/mediatheque');
    await page.getByRole('button', { name: 'Ajouter une image' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG });
    await dialog.getByRole('button', { name: 'Téléverser' }).click();
    await expect(dialog.getByText('Le texte alternatif est obligatoire (sauf image décorative)')).toBeVisible();
    await dialog.getByLabel('Image décorative (aucune information à transmettre)').check();
    await dialog.getByRole('button', { name: 'Téléverser' }).click();
    await expect(page.getByText('Image ajoutée')).toBeVisible();
  });

  test('un événement hebdomadaire apparaît chaque semaine dans le calendrier', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    const next = new Date();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const month = next.toISOString().slice(0, 7);
    await page.goto(`/demo-alpha/agenda?vue=calendrier&mois=${month}`);
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();
    const markets = grid.getByRole('link', { name: /Marché hebdomadaire/ });
    expect(await markets.count()).toBeGreaterThanOrEqual(4);
    await expectNoSeriousA11yViolations(page);
  });
});
