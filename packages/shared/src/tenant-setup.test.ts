import { describe, expect, it } from 'vitest';

import { checkBrandingPalette, formatContrastRatio, normalizeHexColor, slugify, uniqueSlug } from './tenant-setup';

describe('slug', () => {
  it('genere un kebab-case sans accents', () => {
    expect(slugify('Saint-Étienne-du-Rouvray')).toBe('saint-etienne-du-rouvray');
    expect(slugify("L'Haÿ-les-Roses")).toBe('l-hay-les-roses');
    expect(slugify('  Commune  ')).toBe('commune');
  });

  it('garantit l’unicite', () => {
    expect(uniqueSlug('Demo Alpha', ['demo-beta'])).toBe('demo-alpha');
    expect(uniqueSlug('Demo Alpha', ['demo-alpha', 'demo-alpha-2'])).toBe('demo-alpha-3');
    expect(uniqueSlug('!!!', [])).toBe('commune');
  });
});

describe('palette', () => {
  const ok = { primary: '#1d4e89', onPrimary: '#ffffff', secondary: '#f2a900', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a' };

  it('accepte une palette contrastée', () => {
    expect(checkBrandingPalette(ok).every((c) => c.ok)).toBe(true);
  });

  it('refuse un texte trop clair et donne le ratio obtenu', () => {
    const checks = checkBrandingPalette({ ...ok, onPrimary: '#ffffff', primary: '#7fb3ff' });
    const failing = checks.find((c) => c.key === 'onprimary-primary');
    expect(failing?.ok).toBe(false);
    expect(failing?.ratio).toBeLessThan(4.5);
    expect(formatContrastRatio(4.5)).toBe('4,50:1');
  });

  it('normalise les couleurs en minuscules sur 6 caractères', () => {
    expect(normalizeHexColor('#1D4E89')).toBe('#1d4e89');
    expect(normalizeHexColor('1d4e89')).toBe('#1d4e89');
    expect(normalizeHexColor('#fff')).toBeNull();
  });
});
