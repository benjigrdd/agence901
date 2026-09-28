import { scrubSentryEvent } from './sentry-scrub';

/**
 * Options Sentry communes (navigateur, serveur, edge). Projet en region UE ; inactif sans DSN.
 * Aucune donnee personnelle : `sendDefaultPii: false` et effacement systematique avant envoi.
 */
export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
    beforeBreadcrumb: <B extends object>(breadcrumb: B) => scrubSentryEvent(breadcrumb),
  };
}
