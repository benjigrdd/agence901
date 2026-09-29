import type { DataContext } from '@app/data';
import type { GeoPoint, TenantBranding } from '@app/shared';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { bootstrap, repos } from './data';

export type AppState = {
  ctx: DataContext;
  tenantName: string;
  inseeCode: string;
  center: GeoPoint;
  branding: TenantBranding | null;
};

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; app: AppState };

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp doit être utilisé sous AppProvider');
  return app;
}

/** Charge la commune, sa marque et la session de l'habitant ; `fallback` affiche le chargement ou l'erreur. */
export function AppProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: (
    state: { status: 'loading' } | { status: 'error'; message: string; retry: () => void },
  ) => ReactNode;
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    bootstrap()
      .then(async (base) => {
        const branding = await repos.branding.get(base.ctx).catch(() => null);
        setState({ status: 'ready', app: { ...base, branding } });
      })
      .catch((error: unknown) => {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      });
  }, []);

  useEffect(load, [load]);

  if (state.status === 'loading') return fallback(state);
  if (state.status === 'error') return fallback({ ...state, retry: load });
  return <AppContext.Provider value={state.app}>{children}</AppContext.Provider>;
}
