import { List, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/** Bascule Carte / Liste : chaque carte a une alternative en liste equivalente. */
export function ViewSwitch({ current, listHref, mapHref, label }: { current: 'liste' | 'carte'; listHref: string; mapHref: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      <Button asChild size="sm" variant={current === 'liste' ? 'secondary' : 'ghost'}>
        <Link href={listHref} aria-current={current === 'liste' ? 'page' : undefined}>
          <List aria-hidden="true" />
          Liste
        </Link>
      </Button>
      <Button asChild size="sm" variant={current === 'carte' ? 'secondary' : 'ghost'}>
        <Link href={mapHref} aria-current={current === 'carte' ? 'page' : undefined}>
          <MapIcon aria-hidden="true" />
          Carte
        </Link>
      </Button>
    </div>
  );
}
