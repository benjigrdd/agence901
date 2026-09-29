import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

/** Charge une donnée au montage ; `reload` relance la requête (tirer pour rafraîchir). */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  const reload = useCallback(() => {
    load()
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
        }),
      );
  }, [load]);

  useEffect(reload, [reload]);

  return { ...state, reload };
}
