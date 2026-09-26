import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Connexion via l'ecran des personas (mock). */
export async function loginAs(page: Page, personaLabel: string): Promise<void> {
  await page.goto('/connexion');
  await page.getByRole('button', { name: `Se connecter en tant que ${personaLabel}` }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/connexion'));
}

/** Zero violation « serious » ou « critical » (WCAG 2.x A/AA). */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  // Mesure sur l'etat stable : on attend la fin des animations (ouverture de dialog, apparition...).
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Outil de developpement, absent en production.
    .exclude('[data-dev-tool]')
    // Toasts ephemeres : mesures pendant leur animation d'apparition (opacite partielle). Couleurs finales AA
    // fixees dans `components/ui/sonner.tsx`.
    .exclude('[data-sonner-toaster]')
    .analyze();
  const serious = results.violations
    .map((v) =>
      v.id === 'target-size'
        ? // WCAG 2.5.8, exception « essentielle » : la position d'un marqueur sur la carte est l'information ;
          // les marqueurs proches se chevauchent. La vue Liste equivalente reste l'alternative.
          { ...v, nodes: v.nodes.filter((n) => !n.html.includes('data-map-marker')) }
        : v,
    )
    .filter((v) => v.nodes.length > 0)
    .filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
