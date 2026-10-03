import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginAs } from './helpers';

/**
 * RGAA (navigation, presentation) : parcours au clavier seul et reflow. Complete les verifications
 * manuelles de `docs/accessibilite/grille-dashboard.md` (lecteurs d'ecran), sans les remplacer.
 */

/** Tabulations jusqu'a l'element voulu ; echoue s'il n'est pas atteignable au clavier. */
async function tabTo(page: Page, matches: () => Promise<boolean>, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await matches()) return;
  }
  throw new Error('Élément non atteignable au clavier');
}

const focusedIs = (page: Page, test: (el: Element) => boolean) => page.evaluate(`(${test.toString()})(document.activeElement)`) as Promise<boolean>;

/** Focus visible : contour ou ombre non nuls sur l'element actif. */
async function expectVisibleFocus(page: Page) {
  const style = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle !== 'none' && s.outlineWidth !== '0px', shadow: s.boxShadow !== 'none' };
  });
  expect(style?.outline || style?.shadow, 'focus visible').toBe(true);
}

test.describe('clavier seul', () => {
  test('traiter un signalement : lien d’évitement, fiche, changement de statut', async ({ page }) => {
    await loginAs(page, 'Agent Alpha');
    await page.goto('/demo-alpha/signalements?statut=new');
    // Premier arret : lien d'evitement vers le contenu.
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText(/Aller au contenu/);
    await page.keyboard.press('Enter');
    await tabTo(page, () => focusedIs(page, (el) => el.tagName === 'A' && /\/signalements\/[0-9a-f-]{36}$/.test(el.getAttribute('href') ?? '')));
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/signalements\/[0-9a-f-]{36}$/);

    await tabTo(page, () => focusedIs(page, (el) => el.id !== '' && document.querySelector(`label[for="${el.id}"]`)?.textContent?.includes('Nouveau statut') === true));
    await expectVisibleFocus(page);
    // Saisie de la premiere lettre : meme comportement sous Linux et macOS (la fleche bas, elle,
    // ouvre la liste sous macOS mais choisit l'option suivante « Rejete » sous Linux).
    await page.keyboard.type('P');
    await expect(page.locator('#nouveau-statut')).toHaveValue('acknowledged');
    await tabTo(page, () => focusedIs(page, (el) => el.tagName === 'BUTTON' && el.textContent?.includes('Changer le statut') === true));
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Statut changé/)).toBeVisible();
  });

  test('publier une actualité : formulaire entièrement utilisable au clavier', async ({ page }) => {
    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/actualites/nouveau');
    const title = `Clavier ${Date.now() % 100000}`;
    await tabTo(page, () => focusedIs(page, (el) => el.tagName === 'INPUT' && document.querySelector(`label[for="${el.id}"]`)?.textContent?.startsWith('Titre') === true));
    await expectVisibleFocus(page);
    await page.keyboard.type(title);
    await tabTo(page, () => focusedIs(page, (el) => el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true'));
    await page.keyboard.type('Résumé saisi au clavier.');
    await tabTo(page, () => focusedIs(page, (el) => el.getAttribute('contenteditable') === 'true'));
    await page.keyboard.type('Corps de l’article saisi au clavier.');
    await tabTo(page, () => focusedIs(page, (el) => el.tagName === 'BUTTON' && /^Publier/.test(el.textContent?.trim() ?? '')));
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await expect(page.getByText('Publié', { exact: true }).first()).toBeVisible();
  });
});

test.describe('reflow et zoom', () => {
  const ROUTES = ['/demo-alpha', '/demo-alpha/actualites', '/demo-alpha/signalements', '/demo-alpha/agenda', '/demo-alpha/parametres/commune'];

  test('320 px de large : aucun défilement horizontal de la page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await loginAs(page, 'Administrateur Alpha');
    for (const route of ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} : largeur excédentaire`).toBeLessThanOrEqual(1);
    }
  });

  test('zoom 200 % (1 280 px à 200 % = 640 px CSS) : contenu et navigation disponibles', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await loginAs(page, 'Administrateur Alpha');
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /menu|navigation/i }).or(page.getByRole('navigation')).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} : largeur excédentaire`).toBeLessThanOrEqual(1);
    }
  });
});
