import { expect, test } from '@playwright/test';

import { LOCAL_PASSWORD, signIn } from './helpers';

test.describe('authentification du personnel (Supabase)', () => {
  test('identifiants incorrects : message générique', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByLabel('Email').fill('personne@inconnu.test');
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Identifiants incorrects')).toBeVisible();
  });

  test('sans session, une page protégée renvoie vers la connexion', async ({ page }) => {
    await page.goto('/compte/securite');
    await expect(page).toHaveURL(/\/connexion\?next=%2Fcompte%2Fsecurite/);
  });

  test('mot de passe puis code TOTP donnent accès (aal2)', async ({ page }) => {
    await signIn(page, 'admin@demo-alpha.test', '/compte/securite');
    await expect(page).toHaveURL('/compte/securite');
    await expect(page.getByRole('heading', { name: 'Sécurité du compte' })).toBeVisible();
    await expect(page.getByText(/Démo locale · ajouté le/)).toBeVisible();
  });

  test('un code faux est refusé', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByLabel('Email').fill('agent@demo-alpha.test');
    await page.getByLabel('Mot de passe').fill(LOCAL_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByLabel('Code de vérification').fill('000000');
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByText('Code incorrect ou expiré')).toBeVisible();
  });

  test('sans appareil 2FA : configuration obligatoire avec QR code et clé en texte', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByLabel('Email').fill('admin2@demo-alpha.test');
    await page.getByLabel('Mot de passe').fill(LOCAL_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/connexion\/2fa\/configurer/);
    await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
    await expect(page.getByTestId('totp-secret')).toHaveText(/^[A-Z2-7]{16,}$/);
    // Tant que la 2FA n'est pas configuree, aucune autre page n'est accessible.
    await page.goto('/compte/securite');
    await expect(page).toHaveURL(/\/connexion\/2fa\/configurer/);
  });
});
