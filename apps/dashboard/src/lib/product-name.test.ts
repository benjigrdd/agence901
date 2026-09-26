import { PRODUCT_NAME_FALLBACK } from '@app/shared';
import { describe, expect, it } from 'vitest';

import { getProductName } from './product-name';

describe('getProductName', () => {
  it('utilise la valeur fournie', () => {
    expect(getProductName('Villeo')).toBe('Villeo');
  });

  it('se replie sur PRODUCT_NAME_FALLBACK si la valeur est vide', () => {
    expect(getProductName(undefined)).toBe(PRODUCT_NAME_FALLBACK);
    expect(getProductName('   ')).toBe(PRODUCT_NAME_FALLBACK);
  });
});
