'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type BreadcrumbsProps = {
  basePath: string;
  rootLabel: string;
  /** Libelle de chaque segment d'URL (ex. `actualites` -> `Actualités`). */
  labels: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumbs({ basePath, rootLabel, labels }: BreadcrumbsProps) {
  const pathname = usePathname();
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : '';
  const segments = rest.split('/').filter(Boolean);
  const crumbs = [
    { href: basePath, label: rootLabel },
    ...segments.map((segment, i) => ({
      href: `${basePath}/${segments.slice(0, i + 1).join('/')}`,
      label: labels[segment] ?? (UUID.test(segment) ? 'Détail' : segment),
    })),
  ];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.href}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
