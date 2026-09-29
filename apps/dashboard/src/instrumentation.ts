import * as Sentry from '@sentry/nextjs';

import { getDataSource } from './lib/data-source';
import { sentryOptions } from './lib/sentry-options';

export function register() {
  // Echec au demarrage plutot qu'a la premiere requete si la source de donnees est mal configuree.
  getDataSource();
  // Serveur Node et runtime edge (proxy) : meme configuration, DSN serveur ou public.
  Sentry.init(sentryOptions(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN));
}

export const onRequestError = Sentry.captureRequestError;
