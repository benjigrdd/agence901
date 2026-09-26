import type { Module, PermissionLevel, Session } from '@app/shared';
import { can } from '@app/shared';
import type { ReactNode } from 'react';

type CanProps = {
  session: Session | null;
  tenantId: string;
  module: Module;
  level: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Affichage conditionnel pour l'ergonomie uniquement : la securite est appliquee
 * par la couche de donnees, qui revalide chaque action.
 */
export function Can({ session, tenantId, module, level, children, fallback = null }: CanProps) {
  return can(session, tenantId, module, level) ? children : fallback;
}
