import { describe, expect, it } from 'vitest';

describe('@app/data', () => {
  it('se charge', async () => {
    await expect(import('./index')).resolves.toBeTypeOf('object');
  });
});
