import type { Place, PlaceInput } from '@app/shared';
import { PlaceInputSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { NotFoundError } from '../../errors';
import { applyList, byString, parseInput } from '../../list';
import type { PlacesRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { check, pointToEwkt, requirePermission, selectAll, unwrap } from '../core';
import * as m from '../mappers';

export function createPlacesRepository(resolve: ClientResolver): PlacesRepository {
  const fetchOne = async (ctx: DataContext, id: string): Promise<Place> => {
    const row = (await (await resolve(ctx)).from('v_places').select('*').eq('tenant_id', ctx.tenantId).eq('id', id).maybeSingle()).data;
    if (!row) throw new NotFoundError();
    return m.toPlace(row);
  };
  const toRow = (p: PlaceInput) => ({
    category_id: p.categoryId,
    name: p.name,
    point: pointToEwkt(p.point),
    address: p.address,
    opening_hours: p.openingHours,
    phone: p.phone,
    website: p.website,
    description: p.description,
    accessibility: p.accessibility,
    photo_media_id: p.photoMediaId,
    source: p.source,
    external_id: p.externalId,
    detached: p.detached,
    attributes: p.attributes,
  });

  return {
    async list(ctx, params) {
      requirePermission(ctx, 'map', 'read');
      const categoryIds = params?.filters?.categoryId;
      const db = await resolve(ctx);
      const rows = await selectAll(() => {
        let query = db.from('v_places').select('*').eq('tenant_id', ctx.tenantId);
        if (categoryIds?.length) query = query.in('category_id', categoryIds);
        return query.order('id');
      });
      const items = rows
        .map(m.toPlace)
        .filter((p) => !categoryIds?.length || categoryIds.includes(p.categoryId));
      return applyList(items, params, {
        searchText: (p) => `${p.name} ${p.address}`,
        sorters: { name: byString((p: Place) => p.name), updatedAt: byString((p: Place) => p.updatedAt) },
        defaultSort: { field: 'name', direction: 'asc' },
      });
    },
    async get(ctx, id) {
      requirePermission(ctx, 'map', 'read');
      return fetchOne(ctx, id);
    },
    async create(ctx, input) {
      requirePermission(ctx, 'map', 'edit');
      const data = parseInput(PlaceInputSchema, input);
      const row = unwrap(await (await resolve(ctx)).from('places').insert({ ...toRow(data), tenant_id: ctx.tenantId }).select('id').single());
      return fetchOne(ctx, row.id);
    },
    async update(ctx, id, input) {
      requirePermission(ctx, 'map', 'edit');
      await fetchOne(ctx, id);
      const data = parseInput(PlaceInputSchema, input);
      check(await (await resolve(ctx)).from('places').update(toRow(data)).eq('tenant_id', ctx.tenantId).eq('id', id));
      return fetchOne(ctx, id);
    },
    async remove(ctx, id) {
      requirePermission(ctx, 'map', 'edit');
      await fetchOne(ctx, id);
      check(await (await resolve(ctx)).from('places').delete().eq('tenant_id', ctx.tenantId).eq('id', id));
    },
  };
}
