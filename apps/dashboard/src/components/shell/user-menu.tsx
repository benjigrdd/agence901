'use client';

import { CircleUser, LogOut, MonitorX, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { signOutEverywhereAction } from '@/app/actions/auth';
import { signOut } from '@/app/actions/session';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserMenuProps = { displayName: string; roleLabel: string };

export function UserMenu({ displayName, roleLabel }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <CircleUser aria-hidden="true" />
          <span className="hidden sm:inline">{displayName}</span>
          <span className="sr-only sm:hidden">Menu utilisateur</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block">{displayName}</span>
          <span className="text-muted-foreground block text-xs font-normal">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/compte/securite">
            <ShieldCheck aria-hidden="true" />
            Sécurité du compte
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Se déconnecter
            </button>
          </DropdownMenuItem>
        </form>
        <form action={signOutEverywhereAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <MonitorX aria-hidden="true" />
              Se déconnecter de tous les appareils
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
