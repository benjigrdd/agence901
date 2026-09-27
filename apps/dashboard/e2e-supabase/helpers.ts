import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { generate } from 'otplib';

/** Identifiants du seed LOCAL (scripts/seed-local.ts). */
export const LOCAL_PASSWORD = 'Demo-Local-2026!';
export const LOCAL_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

export async function totp(): Promise<string> {
  return generate({ secret: LOCAL_TOTP_SECRET });
}

/** Connexion complete : mot de passe puis code TOTP. */
export async function signIn(page: Page, email: string, next = '/'): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`/connexion?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(LOCAL_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/connexion\/2fa/);
  await page.getByLabel('Code de vérification').fill(await totp());
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/connexion'));
}
