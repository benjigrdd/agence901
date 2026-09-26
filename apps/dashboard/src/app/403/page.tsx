import type { Metadata } from 'next';

import { ForbiddenContent } from '@/components/forbidden-content';

export const metadata: Metadata = { title: 'Accès refusé' };

export default function ForbiddenPage() {
  return <ForbiddenContent />;
}
