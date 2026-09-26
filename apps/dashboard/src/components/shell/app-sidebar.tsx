'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavIcon } from '@/components/nav-icon';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { NavIcon as NavIconName } from '@/lib/navigation';

export type SidebarLink = {
  key: string;
  label: string;
  /** `null` : module V2 annonce, non cliquable. */
  href: string | null;
  icon: NavIconName;
  /** L'element reste actif sur les sous-pages (ex. `/parametres/...`). */
  matchPrefix: boolean;
};

export type SidebarSection = { key: string; label: string; items: SidebarLink[] };

type AppSidebarProps = {
  sections: SidebarSection[];
  title: string;
  subtitle: string;
  logoUrl?: string | null;
  navLabel: string;
};

export function AppSidebar({ sections, title, subtitle, logoUrl, navLabel }: AppSidebarProps) {
  const pathname = usePathname();
  const isActive = (link: SidebarLink) =>
    link.href !== null && (pathname === link.href || (link.matchPrefix && pathname.startsWith(`${link.href}/`)));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo en data URL (mock) ou URL signee : pas d'optimisation Next.
            <img src={logoUrl} alt="" className="size-8 rounded-md object-cover" />
          ) : null}
          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{title}</span>
            <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={navLabel}>
          {sections.map((section) => (
            <SidebarGroup key={section.key}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((link) => (
                    <SidebarMenuItem key={link.key}>
                      {link.href === null ? (
                        <SidebarMenuButton aria-disabled="true" tabIndex={-1} className="cursor-not-allowed opacity-60">
                          <NavIcon name={link.icon} />
                          <span>{link.label}</span>
                          <Badge variant="outline" className="ml-auto">
                            Bientôt
                          </Badge>
                          <span className="sr-only"> (disponible prochainement)</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton asChild isActive={isActive(link)} tooltip={link.label}>
                          <Link href={link.href} aria-current={isActive(link) ? 'page' : undefined}>
                            <NavIcon name={link.icon} />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
