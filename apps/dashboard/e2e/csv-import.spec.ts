import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations, loginAs } from './helpers';

/** Encode en Windows-1252 (export Excel « CSV (separateur : point-virgule) »). */
function windows1252(text: string): Buffer {
  const specials: Record<string, number> = { '’': 0x92, '€': 0x80, '…': 0x85, œ: 0x9c };
  return Buffer.from([...text].map((c) => specials[c] ?? c.charCodeAt(0)));
}

test.describe('import CSV', () => {
  test('agenda : fichier Windows-1252, correspondance des colonnes, lignes valides importées et rapport des 3 erreurs', async ({
    page,
  }) => {
    const suffix = String(Date.now() % 100000);
    const csv = [
      'Intitulé;Date de début;Fin;Catégorie;Lieu',
      `Fête d’été ${suffix};21/06/2027 18:00;21/06/2027 23:30;Culture;`,
      `Brocante ${suffix};32/13/2027;;;`,
      `Marché de Noël ${suffix};12/12/2027;;Vie municipale;`,
      `;01/07/2027;;;`,
      `Tournoi ${suffix};02/07/2027 10:00;;Pétanque;`,
      `Cinéma plein air ${suffix};15/07/2027 22:00;;Culture;`,
    ].join('\r\n');

    await loginAs(page, 'Administrateur Alpha');
    await page.goto('/demo-alpha/agenda');
    await page.getByRole('button', { name: 'Importer un CSV' }).click();
    const dialog = page.getByRole('dialog', { name: 'Importer : événements (CSV)' });
    await dialog
      .getByLabel('Fichier CSV')
      .setInputFiles({ name: 'agenda.csv', mimeType: 'text/csv', buffer: windows1252(csv) });

    await expect(dialog.getByText('fichier encodé en Windows-1252')).toBeVisible();
    // « Intitulé » n'est pas reconnu automatiquement : association manuelle du titre.
    await expect(dialog.getByText('Colonne obligatoire non associée : Titre.')).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Titre (obligatoire)' }).selectOption('Intitulé');
    await expect(dialog.getByRole('cell', { name: `Fête d’été ${suffix}` })).toBeVisible();
    await expect(dialog.getByRole('status').filter({ hasText: 'lignes valides' })).toHaveText(
      '3 lignes valides, 3 lignes en erreur sur 6.',
    );
    await expect(dialog.getByText('Ligne 3 : date de début invalide')).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await dialog.getByRole('button', { name: 'Importer 3 lignes valides' }).click();
    await expect(
      dialog.getByText('Import terminé : 3 éléments créés, 3 lignes en erreur.'),
    ).toBeVisible();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Télécharger le rapport d’erreurs (CSV)' }).click();
    const report = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of report) chunks.push(Buffer.from(chunk));
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('3;Date de début;date de début invalide');

    await dialog.getByRole('button', { name: 'Fermer' }).first().click();
    await page.goto('/demo-alpha/agenda?vue=liste');
    await expect(page.getByText(`Fête d’été ${suffix}`)).toBeVisible();
    await expect(page.getByText(`Marché de Noël ${suffix}`)).toBeVisible();
  });
});
