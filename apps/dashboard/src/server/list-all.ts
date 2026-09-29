import 'server-only';

import type { ListResult } from '@app/data';
import { MAX_PAGE_SIZE } from '@app/data';

/** Toutes les lignes d'une liste paginee (exports, agregats) : parcourt les pages jusqu'au total. */
export async function listAll<T>(fetchPage: (page: number, pageSize: number) => Promise<ListResult<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const chunk = await fetchPage(page, MAX_PAGE_SIZE);
    items.push(...chunk.items);
    if (items.length >= chunk.total || chunk.items.length === 0) return items;
  }
}
