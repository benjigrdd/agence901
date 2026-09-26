import type { Session } from '@app/shared';

export type SessionContext = { session: Session | null };

/** Contexte de chaque appel : qui (session) et pour quelle commune (tenantId). */
export type DataContext = SessionContext & { tenantId: string };

export type SortDirection = 'asc' | 'desc';

export type ListParams<TFilters = Record<string, never>> = {
  filters?: TFilters;
  search?: string;
  sort?: { field: string; direction: SortDirection };
  /** Page commencant a 1. */
  page?: number;
  pageSize?: number;
};

export type ListResult<T> = { items: T[]; total: number };

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 1000;
