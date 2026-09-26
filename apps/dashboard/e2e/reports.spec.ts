import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

async function reportLinks(page: Page, status: string): Promise<string[]> {
  await page.goto(`/demo-alpha/signalements?statut=${status}`);
  const links = page.getByRole('table').getByRole('link');
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
  return hrefs.filter(Boolean);
}

async function changeStatus(page: Page, label: string, message: string) {
  await page.getByLabel('Nouveau statut').selectOption({ label });
  if (message) await page.getByLabel(/Message|Motif/).fill(message);
  await page.getByRole('button', { name: 'Changer le statut' }).click();
  await expect(page.getByText(`Statut changé : ${label}`)).toBeVisible();
}

test.describe('signalements', () => {
  test('traitement complet : pris en compte → en cours → résolu, avec message public', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    const [href] = await reportLinks(page, 'new');
    expect(href).toBeTruthy();
    await page.goto(href ?? '');
    await changeStatus(page, 'Pris en compte', 'Merci, nous avons bien reçu votre signalement.');
    await changeStatus(page, 'En cours', '');
    await changeStatus(page, 'Résolu', 'Réparation effectuée ce matin.');
    const timeline = page.getByRole('region', { name: 'Chronologie' });
    const resolved = timeline.getByRole('listitem').filter({ hasText: 'Réparation effectuée ce matin.' });
    await expect(resolved).toContainText('Visible par l\'habitant');
    await expect(page.getByText('Résolu').first()).toBeVisible();
  });

  test('un rejet exige un motif visible par l’habitant ; une note reste interne', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    const hrefs = await reportLinks(page, 'new');
    await page.goto(hrefs[hrefs.length - 1] ?? '');
    await page.getByRole('textbox', { name: 'Note interne' }).fill('Vérifier avec le service voirie.');
    await page.getByRole('button', { name: 'Ajouter la note' }).click();
    const timeline = page.getByRole('region', { name: 'Chronologie' });
    await expect(timeline.getByRole('listitem').filter({ hasText: 'Vérifier avec le service voirie.' })).toContainText('Note interne');

    await page.getByLabel('Nouveau statut').selectOption({ label: 'Rejeté' });
    await expect(page.getByLabel('Visible par l’habitant')).toBeChecked();
    await expect(page.getByLabel('Visible par l’habitant')).toBeDisabled();
    await page.getByRole('button', { name: 'Changer le statut' }).click();
    await expect(page.getByText('Un motif est obligatoire pour rejeter un signalement')).toBeVisible();
    await page.getByLabel('Motif du rejet').fill('Ce trottoir relève du département.');
    await page.getByRole('button', { name: 'Changer le statut' }).click();
    await expect(timeline.getByRole('listitem').filter({ hasText: 'Ce trottoir relève du département.' })).toContainText('Visible par l\'habitant');
  });

  test('marquer un doublon exige l’original, puis passe en lecture seule', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    for (const href of await reportLinks(page, 'new')) {
      await page.goto(href);
      await page.getByRole('button', { name: 'Marquer comme doublon' }).click();
      const dialog = page.getByRole('dialog');
      if ((await dialog.getByRole('radio').count()) === 0) {
        await page.keyboard.press('Escape');
        continue;
      }
      await dialog.getByRole('button', { name: 'Confirmer le doublon' }).click();
      await expect(dialog.getByText('Choisissez le signalement d’origine')).toBeVisible();
      await dialog.getByRole('radio').first().check();
      await dialog.getByRole('button', { name: 'Confirmer le doublon' }).click();
      await expect(page.getByText('Ce signalement est un doublon, en lecture seule.')).toBeVisible();
      await expect(page.getByRole('link', { name: /Voir le signalement d’origine/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Changer le statut' })).toHaveCount(0);
      return;
    }
    throw new Error('Aucun signalement avec un doublon probable dans les données de démonstration');
  });

  test('filtre « en retard » et export CSV sans données personnelles', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/signalements?retard=1');
    const rows = page.getByRole('table').getByRole('row');
    expect(await rows.count()).toBeGreaterThan(1);
    await expect(page.getByRole('table').getByText('En retard').first()).toBeVisible();
    const response = await page.request.get('/demo-alpha/signalements/export');
    expect(response.headers()['content-type']).toContain('text/csv');
    const csv = await response.text();
    expect(csv).toContain('Référence;Date;Catégorie;Adresse;Statut;Service;Délai (jours)');
    expect(csv).not.toContain('@');
  });

  test('accessibilité : liste, carte et détail des signalements', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/signalements');
    await expectNoSeriousA11yViolations(page);
    await page.goto('/demo-alpha/signalements?vue=carte');
    await expect(page.getByRole('region', { name: /Carte des \d+ signalements/ })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    const [href] = await reportLinks(page, 'in_progress');
    await page.goto(href ?? '');
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('carte et quartiers', () => {
  test('l’agent traite les signalements mais n’accède ni à la carte ni aux quartiers', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    expect((await page.goto('/demo-alpha/signalements'))?.status()).toBe(200);
    expect((await page.goto('/demo-alpha/carte'))?.status()).toBe(403);
    expect((await page.goto('/demo-alpha/quartiers'))?.status()).toBe(403);
  });

  test('créer un lieu à partir d’une adresse', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/carte/nouveau');
    const name = `Maison des associations ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Nom', exact: true }).fill(name);
    await page.getByLabel('Catégorie').selectOption({ index: 1 });
    await page.getByRole('combobox', { name: 'Adresse' }).fill('10 rue de la Paix Paris');
    const option = page.getByRole('option').first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) await option.click();
    else await page.getByRole('combobox', { name: 'Adresse' }).fill('10 rue de la Paix, Paris');
    await page.getByRole('checkbox', { name: 'Fermé' }).first().uncheck();
    await page.getByRole('button', { name: 'Enregistrer le lieu' }).click();
    await expect(page).toHaveURL(/\/demo-alpha\/carte\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText('Source :')).toContainText('Manuel');
  });

  test('un quartier importé apparaît dans le sélecteur des actualités', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/quartiers');
    await expectNoSeriousA11yViolations(page);
    await page.getByRole('button', { name: 'Nouveau quartier' }).click();
    const name = `Les Tilleuls ${Date.now()}`;
    await page.getByLabel('Nom').fill(name);
    await page.getByLabel('Importer un GeoJSON').setInputFiles({ name: 'q.geojson', mimeType: 'application/geo+json', buffer: Buffer.from('{"type":"Point","coordinates":[2,48]}') });
    await expect(page.getByText(/GeoJSON non reconnu/)).toBeVisible();
    const polygon = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[2.3, 48.8], [2.31, 48.8], [2.31, 48.81], [2.3, 48.81], [2.3, 48.8]]] } };
    await page.getByLabel('Importer un GeoJSON').setInputFiles({ name: 'q.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(polygon)) });
    await expect(page.getByText('1 polygone dessiné')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer le quartier' }).click();
    await expect(page.getByText('Quartier enregistré')).toBeVisible();
    await page.goto('/demo-alpha/actualites');
    await expect(page.getByLabel('Quartier').getByRole('option', { name })).toHaveCount(1);
  });
});
