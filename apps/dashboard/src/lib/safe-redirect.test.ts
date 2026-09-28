import { describe, expect, it } from 'vitest';

import { safeNextPath } from './safe-redirect';

describe('safeNextPath', () => {
  it.each(['/demo-alpha/signalements?statut=new', '/', '/compte/securite#2fa'])('garde %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each(['//evil.example', '/\\evil.example', '/\\/evil.example', 'https://evil.example', 'javascript:alert(1)', '/\tevil', '', null, 42])('refuse %s', (value) => {
    expect(safeNextPath(value)).toBe('/');
  });
});
