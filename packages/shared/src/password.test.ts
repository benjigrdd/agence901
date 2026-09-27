import { describe, expect, it } from 'vitest';

import { passwordStrength } from './password';

describe('passwordStrength', () => {
  it('refuse moins de 12 caractères', () => {
    const s = passwordStrength('Ab1!ab1!');
    expect(s.acceptable).toBe(false);
    expect(s.hints).toContain('12 caractères minimum');
  });

  it('pénalise les mots courants et les répétitions', () => {
    expect(passwordStrength('Motdepasse2026!').acceptable).toBe(false);
    expect(passwordStrength('aaaaaaaaaaaaaaaaaaaa').score).toBe(0);
  });

  it('accepte une phrase de passe variée', () => {
    const s = passwordStrength('Tilleul-Violet-42-Rivière');
    expect(s.acceptable).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(3);
  });
});
