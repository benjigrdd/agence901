import 'server-only';

import { cache } from 'react';

/** Heure de reference de la requete : identique pour tous les composants d'un meme rendu. */
export const getRequestTime = cache((): Date => new Date());
