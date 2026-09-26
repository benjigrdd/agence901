import type { Metadata } from 'next';

import { ForbiddenContent } from '@/components/forbidden-content';

export const metadata: Metadata = { title: 'Accès refusé' };

/** Rendu par `forbidden()` (reponse HTTP 403). */
export default function Forbidden() {
  return <ForbiddenContent />;
}
