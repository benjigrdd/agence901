import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

// PNG 1x1 valide pour le televersement vers Supabase Storage.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

test.describe('dashboard branché sur Supabase', () => {
  test('accueil et traitement d’un signalement (RPC, audit)', async ({ page }) => {
    await signIn(page, 'admin@demo-alpha.test', '/demo-alpha');
    await expect(page).toHaveURL('/demo-alpha');
    await expect(page.getByText('Signalements ouverts')).toBeVisible();
    await page.goto('/demo-alpha/signalements?statut=new');
    const first = page.getByRole('table').getByRole('link').first();
    await first.click();
    await page.getByLabel('Nouveau statut').selectOption({ label: 'Pris en compte' });
    await page.getByLabel(/Message/).fill('Merci, nous intervenons cette semaine.');
    await page.getByRole('button', { name: 'Changer le statut' }).click();
    await expect(page.getByText('Statut changé : Pris en compte')).toBeVisible();
    const timeline = page.getByRole('region', { name: 'Chronologie' });
    await expect(timeline.getByRole('listitem').filter({ hasText: 'Merci, nous intervenons cette semaine.' })).toContainText('Visible par l\'habitant');
  });

  test('circuit de validation : l’agent soumet, l’admin publie', async ({ page }) => {
    const title = `Travaux Supabase ${Date.now()}`;
    await signIn(page, 'agent@demo-alpha.test', '/demo-alpha/actualites/nouveau');
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(title);
    await page.getByLabel('Résumé').fill('Circulation perturbée rue des Écoles.');
    await expect(page.getByRole('button', { name: 'Publier maintenant' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Soumettre à validation' }).click();
    await expect(page.getByText('À valider').first()).toBeVisible();
    const postUrl = page.url();

    await signIn(page, 'admin@demo-alpha.test', postUrl.replace(/^https?:\/\/[^/]+/, ''));
    await page.getByRole('button', { name: 'Publier maintenant' }).click();
    await expect(page.getByText('Publié').first()).toBeVisible();
  });

  test('médiathèque : téléversement vers Supabase Storage', async ({ page }) => {
    await signIn(page, 'agent@demo-alpha.test', '/demo-alpha/mediatheque');
    await page.getByRole('button', { name: 'Ajouter une image' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG });
    await dialog.getByLabel('Image décorative (aucune information à transmettre)').check();
    await dialog.getByRole('button', { name: 'Téléverser' }).click();
    await expect(page.getByText('Image ajoutée')).toBeVisible();
  });

  test('droits : l’agent n’accède pas à la carte ni à l’espace éditeur', async ({ page }) => {
    await signIn(page, 'agent@demo-alpha.test', '/demo-alpha');
    expect((await page.goto('/demo-alpha/carte'))?.status()).toBe(403);
    expect((await page.goto('/demo-beta'))?.status()).toBe(404);
    expect((await page.goto('/admin'))?.status()).toBe(404);
  });

  test('éditeur : liste des communes et accès tracé dans l’audit', async ({ page }) => {
    await signIn(page, 'editeur@plateforme-demo.test', '/admin/communes');
    await expect(page.getByRole('link', { name: 'Commune Démo Alpha', exact: true })).toBeVisible();
    await page.goto('/demo-alpha/actualites');
    await page.goto('/demo-alpha/audit?action=platform_access');
    await expect(page.getByRole('table')).toContainText('Accès éditeur');
  });
});
