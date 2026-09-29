export type DataSourceName = 'mock' | 'supabase';

type DataSourceEnv = {
  DATA_SOURCE?: string | undefined;
  ALLOW_MOCK_DATA?: string | undefined;
  NODE_ENV?: string | undefined;
};

/**
 * Source de donnees, en echec ferme : en production, le mock (personas sans authentification)
 * n'est accepte que sur demande explicite (`ALLOW_MOCK_DATA=1` : E2E, demo). Une variable oubliee
 * sur l'hebergeur fait echouer le demarrage au lieu d'ouvrir le dashboard a tous.
 */
export function resolveDataSource(env: DataSourceEnv): DataSourceName {
  const value = env.DATA_SOURCE?.trim();
  if (value === 'supabase') return 'supabase';
  if (value && value !== 'mock') throw new Error(`DATA_SOURCE invalide : « ${value} » (attendu : supabase ou mock)`);
  if (env.NODE_ENV === 'production' && env.ALLOW_MOCK_DATA !== '1') {
    throw new Error(
      value
        ? 'DATA_SOURCE=mock refusé en production : définir ALLOW_MOCK_DATA=1 pour une démo ou des tests E2E'
        : 'DATA_SOURCE manquante en production : définir DATA_SOURCE=supabase',
    );
  }
  return 'mock';
}

export function getDataSource(): DataSourceName {
  return resolveDataSource({
    DATA_SOURCE: process.env.DATA_SOURCE,
    ALLOW_MOCK_DATA: process.env.ALLOW_MOCK_DATA,
    NODE_ENV: process.env.NODE_ENV,
  });
}
