import { Construction } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

type ModulePlaceholderProps = { title: string; description: string; lot: string };

export function ModulePlaceholder({ title, description, lot }: ModulePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title={`Module en construction (lot ${lot})`}
        description="Cet écran sera disponible dans une prochaine version."
      />
    </>
  );
}
