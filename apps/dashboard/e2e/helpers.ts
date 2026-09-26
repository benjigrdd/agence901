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
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Outil de developpement, absent en production.
    .exclude('[data-dev-tool]')
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
