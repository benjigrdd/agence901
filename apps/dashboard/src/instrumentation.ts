import * as Sentry from '@sentry/nextjs';

import { sentryOptions } from './lib/sentry-options';

export function register() {
  // Serveur Node et runtime edge (proxy) : meme configuration, DSN serveur ou public.
  Sentry.init(sentryOptions(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN));
}

export const onRequestError = Sentry.captureRequestError;
