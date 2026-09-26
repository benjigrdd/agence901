import type { Media } from '@app/shared';
import { MediaMetaInputSchema, MediaSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { MediaListItem, MediaRepository } from '../../ports';
import { applyList, byNumber, byString, parseInput, requirePermission } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';

export function createMediaRepository(rt: MockRuntime): MediaRepository {
  const { store } = rt;

  const usageCount = (tenantId: string, mediaId: string): number =>
    store.posts.forTenant(tenantId).filter((p) => p.coverMediaId === mediaId).length +
    store.events.forTenant(tenantId).filter((e) => e.coverMediaId === mediaId).length +
    store.places.forTenant(tenantId).filter((p) => p.photoMediaId === mediaId).length;

  const item = (media: Media): MediaListItem => ({ media, usageCount: usageCount(media.tenantId, media.id) });

  const getMedia = (ctx: DataContext, id: string) => {
    const media = store.media.get(ctx.tenantId, id);
    if (!media) throw new NotFoundError('Image introuvable');
    return media;
  };

  return {
    async list(ctx, params) {
      requirePermission(store, ctx, 'media', 'read');
      const mimes = params?.filters?.mime;
      const rows = store.media
        .forTenant(ctx.tenantId)
        .filter((m) => !mimes || mimes.length === 0 || mimes.includes(m.mime))
        .map(item);
      return applyList(rows, params, {
        searchText: (i) => `${i.media.altText} ${i.media.credit ?? ''} ${i.media.path}`,
        sorters: {
          createdAt: byString((i: MediaListItem) => i.media.createdAt),
          usage: byNumber((i: MediaListItem) => i.usageCount),
        },
        defaultSort: { field: 'createdAt', direction: 'desc' },
      });
    },

    async get(ctx, id) {
      requirePermission(store, ctx, 'media', 'read');
      return item(getMedia(ctx, id));
    },

    async upload(ctx, file, meta) {
      const session = requirePermission(store, ctx, 'media', 'edit');
      const data = parseInput(MediaMetaInputSchema, meta);
      if (!file.dataUrl.startsWith(`data:${file.mime}`)) {
        throw new ValidationError('Fichier image invalide', [{ path: 'file', message: 'Fichier image invalide' }]);
      }
      const id = rt.newId();
      const now = nowIso(rt);
      const extension = file.mime.split('/')[1]?.replace('+xml', '') ?? 'bin';
      const media = parseInput(MediaSchema, {
        id,
        tenantId: ctx.tenantId,
        path: `${ctx.tenantId}/${id}.${extension}`,
        url: file.dataUrl,
        mime: file.mime,
        width: file.width,
        height: file.height,
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      store.media.set(media);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'upload', entity: 'media', entityId: id, before: null, after: { ...media, url: '(fichier)' } });
      return media;
    },

    async update(ctx, id, meta) {
      const session = requirePermission(store, ctx, 'media', 'edit');
      const existing = getMedia(ctx, id);
      const data = parseInput(MediaMetaInputSchema, meta);
      const media = parseInput(MediaSchema, { ...existing, ...data, updatedAt: nowIso(rt) });
      store.media.set(media);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'media', entityId: id, before: { ...existing, url: '(fichier)' }, after: { ...media, url: '(fichier)' } });
      return media;
    },

    async remove(ctx, id) {
      const session = requirePermission(store, ctx, 'media', 'edit');
      const existing = getMedia(ctx, id);
      const used = usageCount(ctx.tenantId, id);
      if (used > 0) {
        throw new ConflictError(`Image utilisée par ${used} contenu${used > 1 ? 's' : ''} : suppression impossible`);
      }
      store.media.delete(id);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'delete', entity: 'media', entityId: id, before: { ...existing, url: '(fichier)' }, after: null });
    },
  };
}
