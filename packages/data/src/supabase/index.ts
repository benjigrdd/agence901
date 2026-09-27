import type { Repositories } from '../ports';
import type { ClientResolver } from './core';
import { createAuditRepositories } from './repos/audit-usage';
import { createCitizenRepository } from './repos/citizen';
import { createEventsRepository, createPostsRepository } from './repos/content';
import { createMediaRepository } from './repos/media';
import { createMembersRepository } from './repos/members';
import { createNotificationsRepository } from './repos/notifications';
import { createOpenDataRepository } from './repos/open-data';
import { createPlacesRepository } from './repos/places';
import { createReportsRepository } from './repos/reports';
import { createTenancyRepositories } from './repos/tenancy';
import { createTerritoryRepositories } from './repos/territory';

export type { ClientResolver, Db } from './core';
export { toDataError } from './core';
export type { Database, Json } from './database.types';

/**
 * Adaptateur Supabase : memes ports que le mock. `resolve` fournit le client de l'appelant
 * (session dans les cookies cote dashboard) : la RLS s'applique a chaque requete.
 */
export function createSupabaseRepositories(resolve: ClientResolver): Repositories {
  const territory = createTerritoryRepositories(resolve);
  return {
    ...createTenancyRepositories(resolve),
    members: createMembersRepository(resolve),
    posts: createPostsRepository(resolve),
    events: createEventsRepository(resolve),
    media: createMediaRepository(resolve),
    places: createPlacesRepository(resolve),
    placeCategories: territory.placeCategories,
    reports: createReportsRepository(resolve),
    reportCategories: territory.reportCategories,
    services: territory.services,
    districts: territory.districts,
    topics: territory.topics,
    environment: territory.environment,
    procedures: territory.procedures,
    notifications: createNotificationsRepository(resolve),
    ...createAuditRepositories(resolve),
    citizen: createCitizenRepository(resolve),
    openData: createOpenDataRepository(resolve),
  };
}
