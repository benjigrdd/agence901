'use client';

import { ErrorPanel } from '@/components/error-panel';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel reset={reset} />;
}
