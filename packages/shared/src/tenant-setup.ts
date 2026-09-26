import { contrastRatio } from './contrast';
import type { BrandingColors } from './schemas/tenant-branding';

/** Identifiant d'URL en kebab-case (sans accents), 40 caracteres au plus. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Premier slug libre : `base`, puis `base-2`, `base-3`... */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || 'commune';
  if (!used.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Couleur en hexadecimal sur 6 caracteres, en minuscules (`#1D4E89` → `#1d4e89`, `1d4` → null). */
export function normalizeHexColor(value: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match?.[1] ? `#${match[1].toLowerCase()}` : null;
}

export const MIN_TEXT_CONTRAST = 4.5;

export type PaletteCheck = { key: string; label: string; ratio: number; ok: boolean };

/** Couples texte / fond a verifier pour une marque (AA, 4,5:1). */
export function checkBrandingPalette(colors: BrandingColors): PaletteCheck[] {
  const pairs: [string, string, string, string][] = [
    ['text-background', 'Texte sur fond', colors.text, colors.background],
    ['onprimary-primary', 'Texte sur couleur primaire', colors.onPrimary, colors.primary],
    ['text-surface', 'Texte sur surface', colors.text, colors.surface],
  ];
  return pairs.map(([key, label, fg, bg]) => {
    const valid = normalizeHexColor(fg) !== null && normalizeHexColor(bg) !== null;
    const ratio = valid ? Math.round(contrastRatio(fg, bg) * 100) / 100 : 0;
    return { key, label, ratio, ok: valid && ratio >= MIN_TEXT_CONTRAST };
  });
}

export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2).replace('.', ',')}:1`;
}
