import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

test.describe('accueil et notifications', () => {
  test('l’accueil de l’agent masque les blocs des modules inaccessibles', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha');
    await expect(page.getByRole('heading', { name: 'Dernières actions' })).toBeVisible();
    await expect(page.getByText(/\d+ créés, \d+ résolus sur la période/)).toBeVisible();
    await page.getByRole('button', { name: 'Voir les données' }).click();
    await expect(page.getByRole('table', { name: 'Signalements créés et résolus par semaine' })).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await loginAs(page, 'Agent Alpha');
    await page.goto('/demo-alpha');
    await expect(page.getByText('Signalements ouverts')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dernières actions' })).toHaveCount(0);
  });

  test('composer une notification ciblée par quartier, avec estimation d’audience', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/notifications');
    const audience = page.getByTestId('audience');
    await expect(audience).toContainText(/Environ \d/);
    const all = await audience.textContent();
    await page.getByLabel('Quartiers').check();
    await page.getByRole('group', { name: 'Quartiers ciblés' }).getByRole('checkbox').first().check();
    await expect(audience).not.toHaveText(all ?? '');
    await page.getByLabel('Titre').fill('Travaux rue des Lilas');
    await page.getByLabel('Message', { exact: true }).fill('Circulation alternée lundi et mardi.');
    await page.getByRole('button', { name: 'Envoyer la notification' }).click();
    await expect(page.getByRole('dialog')).toContainText(/Vous allez notifier environ \d+ habitants?\. Confirmer \?/);
    await expectNoSeriousA11yViolations(page);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByText('Notification envoyée')).toBeVisible();
    await expect(page.getByRole('table')).toContainText('Travaux rue des Lilas');
  });

  test('au-delà de 3 notifications non urgentes, une justification est exigée', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    for (let i = 0; i < 4; i++) {
      await page.goto('/demo-alpha/notifications');
      if (await page.getByLabel('Justification').isVisible()) break;
      await page.getByLabel('Titre').fill(`Info ${i}`);
      await page.getByLabel('Message', { exact: true }).fill('Information pratique.');
      await page.getByRole('button', { name: 'Envoyer la notification' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
      await expect(page.getByText('Notification envoyée').first()).toBeVisible();
    }
    await page.goto('/demo-alpha/notifications');
    await expect(page.getByLabel('Justification')).toBeVisible();
    await page.getByLabel('Titre').fill('Encore une info');
    await page.getByLabel('Message', { exact: true }).fill('Information pratique.');
    await page.getByRole('button', { name: 'Envoyer la notification' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'une justification est obligatoire' })).toBeVisible();
    await page.getByLabel('Urgente (sécurité, coupure, alerte) : hors limite quotidienne').check();
    await expect(page.getByLabel('Justification')).toHaveCount(0);
  });
});

test.describe('démarches, environnement, paramètres, audit', () => {
  test('une démarche du catalogue s’ajoute en un clic et se réordonne au clavier', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/demarches');
    const add = page.getByRole('button', { name: /^Ajouter la démarche « (?!Portail)/ }).first();
    const name = ((await add.textContent()) ?? '').match(/« (.+) »/)?.[1] ?? '';
    await add.click();
    await expect(page.getByText('Démarche enregistrée')).toBeVisible();
    const handle = page.getByRole('button', { name: `Déplacer « ${name} »` });
    await expect(handle).toBeVisible();
    const list = page.getByRole('list').filter({ has: handle });
    const before = await list.getByRole('listitem').allTextContents();
    await page.getByRole('button', { name: `Monter « ${name} »` }).click();
    await expect.poll(async () => list.getByRole('listitem').allTextContents()).not.toEqual(before);
    const moved = await list.getByRole('listitem').allTextContents();
    await expect(page.getByRole('button', { name: `Monter « ${name} »` })).toBeFocused();
    await handle.focus();
    // dnd-kit mesure les positions entre deux touches : on laisse passer une image.
    for (const key of ['Space', 'ArrowDown', 'Space']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(250);
    }
    await expect(page.getByText(/déposé en position/)).toBeAttached();
    await expect.poll(async () => list.getByRole('listitem').allTextContents()).not.toEqual(moved);
    await expectNoSeriousA11yViolations(page);
  });

  test('environnement : onglets accessibles et 8 prochaines collectes', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/environnement?onglet=calendrier');
    const first = page.getByRole('list').filter({ hasText: /Ordures|Recyclables|Verre|Biodéchets|Encombrants|Déchets verts/ }).last();
    await expect(first.getByRole('listitem')).toHaveCount(8);
    await expectNoSeriousA11yViolations(page);
    for (const tab of ['', '?onglet=tri', '?onglet=decheteries']) {
      await page.goto(`/demo-alpha/environnement${tab}`);
      await expectNoSeriousA11yViolations(page);
    }
  });

  test('inviter un agent avec des droits partiels puis se connecter en tant que lui', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/parametres/membres');
    await expectNoSeriousA11yViolations(page);
    const name = `Camille Martin ${Date.now() % 10000}`;
    await page.getByRole('button', { name: 'Inviter un membre' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom').fill(name);
    await dialog.getByLabel('Email').fill(`camille${Date.now()}@exemple.test`);
    await dialog.getByLabel('Actualités : Aucun').check();
    await dialog.getByLabel('Signalements : Édition').check();
    await dialog.getByRole('button', { name: 'Envoyer l’invitation' }).click();
    await expect(page.getByText('Invitation créée')).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Invité');

    await page.goto('/connexion');
    await page.getByRole('button', { name: `Se connecter en tant que ${name}` }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/connexion'));
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Signalements' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Actualités' })).toHaveCount(0);
  });

  test('impossible de désactiver le dernier administrateur', async ({ page }) => {
    await loginAs(page, 'Administrateur Bêta');
    await page.goto('/demo-beta/parametres/membres');
    await page.getByRole('row', { name: /\(vous\)/ }).getByRole('button', { name: /Désactiver/ }).click();
    await expect(page.getByText('la commune doit garder au moins un administrateur actif').first()).toBeVisible();
  });

  test('l’agent n’accède ni aux membres ni à l’audit', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    expect((await page.goto('/demo-alpha/parametres/membres'))?.status()).toBe(403);
    expect((await page.goto('/demo-alpha/audit'))?.status()).toBe(403);
  });

  test('le journal d’audit affiche le diff d’une modification', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/parametres/thematiques');
    await expectNoSeriousA11yViolations(page);
    const label = `Patrimoine ${Date.now() % 10000}`;
    await page.getByLabel('Nouvelle thématique').fill(label);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByText('Thématique ajoutée')).toBeVisible();
    await page.goto('/demo-alpha/audit?entite=topic');
    await expect(page.getByText('Conservation : 12 mois')).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.getByRole('button', { name: /Voir le détail/ }).first().click();
    await expect(page.getByRole('dialog')).toContainText(label);
    for (const url of ['/demo-alpha/parametres/services', '/demo-alpha/parametres/commune']) {
      await page.goto(url);
      await expectNoSeriousA11yViolations(page);
    }
  });
});
