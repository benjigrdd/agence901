import type { z } from 'zod';

import type { ListParams, ListResult, SortDirection } from './context';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './context';
import { NotFoundError, ValidationError } from './errors';

/* Utilitaires communs aux adaptateurs (mock et Supabase) : validation, recherche, tri, pagination. */

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

export function found<T>(value: T | undefined, message?: string): T {
  if (value === undefined) throw new NotFoundError(message);
  return value;
}

// ---------------------------------------------------------------------------
// Listes : recherche, tri, pagination
// ---------------------------------------------------------------------------

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export type Comparator<T> = (a: T, b: T) => number;

export type ListOptions<T> = {
  searchText?: (item: T) => string;
  sorters: Record<string, Comparator<T>>;
  defaultSort: { field: string; direction: SortDirection };
};

export function applyList<T, F>(items: T[], params: ListParams<F> | undefined, options: ListOptions<T>): ListResult<T> {
  let rows = items;
  const search = params?.search?.trim();
  if (search && options.searchText) {
    const needle = normalizeText(search);
    const text = options.searchText;
    rows = rows.filter((item) => normalizeText(text(item)).includes(needle));
  }
  const sort = params?.sort ?? options.defaultSort;
  const comparator = options.sorters[sort.field] ?? options.sorters[options.defaultSort.field];
  if (comparator) {
    const sign = sort.direction === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => sign * comparator(a, b));
  }
  const pageSize = Math.min(Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(1, params?.page ?? 1);
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length };
}

export const byString =
  <T>(pick: (item: T) => string | null): Comparator<T> =>
  (a, b) =>
    (pick(a) ?? '').localeCompare(pick(b) ?? '', 'fr');

export const byNumber =
  <T>(pick: (item: T) => number): Comparator<T> =>
  (a, b) =>
    pick(a) - pick(b);
