import type { Place, PlaceCategory } from '@app/shared';
import { PlaceCategoryInputSchema, PlaceCategorySchema, PlaceInputSchema, PlaceSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { PlaceCategoriesRepository, PlacesRepository } from '../../ports';
import { applyList, byString, parseInput, requirePermission } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';
import { createSimpleRepository } from './simple';

export function createPlacesRepositories(rt: MockRuntime): {
  places: PlacesRepository;
  placeCategories: PlaceCategoriesRepository;
} {
  const { store } = rt;

  const getPlace = (ctx: DataContext, id: string) => {
    const place = store.places.get(ctx.tenantId, id);
    if (!place) throw new NotFoundError('Lieu introuvable');
    return place;
  };

  const checkCategory = (ctx: DataContext, categoryId: string) => {
    if (!store.placeCategories.get(ctx.tenantId, categoryId)) {
      throw new ValidationError('Catégorie inconnue', [{ path: 'categoryId', message: 'Catégorie inconnue' }]);
    }
  };

  const places: PlacesRepository = {
    async list(ctx, params) {
      requirePermission(store, ctx, 'map', 'read');
      const categoryIds = params?.filters?.categoryId;
      const rows = store.places
        .forTenant(ctx.tenantId)
        .filter((p) => !categoryIds || categoryIds.length === 0 || categoryIds.includes(p.categoryId));
      return applyList(rows, params, {
        searchText: (p) => `${p.name} ${p.address}`,
        sorters: { name: byString((p: Place) => p.name), updatedAt: byString((p: Place) => p.updatedAt) },
        defaultSort: { field: 'name', direction: 'asc' },
      });
    },

    async get(ctx, id) {
      requirePermission(store, ctx, 'map', 'read');
      return getPlace(ctx, id);
    },

    async create(ctx, input) {
      const session = requirePermission(store, ctx, 'map', 'edit');
      const data = parseInput(PlaceInputSchema, input);
      checkCategory(ctx, data.categoryId);
      const now = nowIso(rt);
      const place = parseInput(PlaceSchema, { ...data, id: rt.newId(), tenantId: ctx.tenantId, createdAt: now, updatedAt: now });
      store.places.set(place);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'create', entity: 'place', entityId: place.id, before: null, after: place });
      return place;
    },

    async update(ctx, id, input) {
      const session = requirePermission(store, ctx, 'map', 'edit');
      const existing = getPlace(ctx, id);
      const data = parseInput(PlaceInputSchema, input);
      checkCategory(ctx, data.categoryId);
      const place = parseInput(PlaceSchema, { ...existing, ...data, updatedAt: nowIso(rt) });
      store.places.set(place);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'place', entityId: id, before: existing, after: place });
      return place;
    },

    async remove(ctx, id) {
      const session = requirePermission(store, ctx, 'map', 'edit');
      const existing = getPlace(ctx, id);
      store.places.delete(id);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'delete', entity: 'place', entityId: id, before: existing, after: null });
    },
  };

  const placeCategories = createSimpleRepository(rt, {
    collection: store.placeCategories,
    schema: PlaceCategorySchema,
    inputSchema: PlaceCategoryInputSchema,
    entity: 'place_category',
    read: 'public',
    write: { module: 'map', level: 'edit' },
    sort: byString((c: PlaceCategory) => c.label),
    serverFields: (existing) => ({ isDefault: existing?.isDefault ?? false }),
    beforeWrite: (ctx, data, existing) => {
      const clash = store.placeCategories
        .forTenant(ctx.tenantId)
        .some((c) => c.key === data.key && c.id !== existing?.id);
      if (clash) throw new ConflictError('Une catégorie utilise déjà cet identifiant');
      if (existing?.isDefault && existing.key !== data.key) {
        throw new ConflictError("L'identifiant d'une catégorie par défaut ne peut pas changer");
      }
    },
    beforeRemove: (ctx, category) => {
      if (category.isDefault) throw new ConflictError('Une catégorie par défaut ne peut pas être supprimée : masquez-la');
      if (store.places.forTenant(ctx.tenantId).some((p) => p.categoryId === category.id)) {
        throw new ConflictError('Catégorie utilisée par des lieux : suppression impossible');
      }
    },
  });

  return { places, placeCategories };
}
