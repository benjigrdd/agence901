import { describe, expect, it } from 'vitest';

import { resolveDataSource } from './data-source';

describe('resolveDataSource', () => {
  it('retient supabase quel que soit l environnement', () => {
    expect(resolveDataSource({ DATA_SOURCE: 'supabase', NODE_ENV: 'production' })).toBe('supabase');
    expect(resolveDataSource({ DATA_SOURCE: 'supabase', NODE_ENV: 'development' })).toBe('supabase');
  });

  it('utilise le mock par defaut hors production', () => {
    expect(resolveDataSource({ NODE_ENV: 'development' })).toBe('mock');
    expect(resolveDataSource({ DATA_SOURCE: 'mock', NODE_ENV: 'test' })).toBe('mock');
  });

  it('echoue en production si la variable manque', () => {
    expect(() => resolveDataSource({ NODE_ENV: 'production' })).toThrow(/DATA_SOURCE manquante/);
  });

  it('refuse le mock en production sans autorisation explicite', () => {
    expect(() => resolveDataSource({ DATA_SOURCE: 'mock', NODE_ENV: 'production' })).toThrow(/ALLOW_MOCK_DATA/);
    expect(() => resolveDataSource({ NODE_ENV: 'production', ALLOW_MOCK_DATA: 'true' })).toThrow();
    expect(resolveDataSource({ DATA_SOURCE: 'mock', NODE_ENV: 'production', ALLOW_MOCK_DATA: '1' })).toBe('mock');
  });

  it('rejette une valeur inconnue', () => {
    expect(() => resolveDataSource({ DATA_SOURCE: 'Supabase', NODE_ENV: 'development' })).toThrow(/invalide/);
  });
});
