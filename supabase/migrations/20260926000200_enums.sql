-- Genere par scripts/db/generate-sql.ts depuis @app/shared : ne pas modifier a la main.

create type public.module_key as enum ('news', 'events', 'reports', 'map', 'mobility', 'procedures', 'participation', 'notifications', 'services', 'environment', 'media', 'districts', 'settings', 'audit');
create type public.app_role as enum ('admin', 'agent');
create type public.permission_level as enum ('read', 'edit', 'publish');
create type public.post_type as enum ('news', 'works', 'decision', 'alert');
create type public.alert_level as enum ('info', 'important', 'urgent');
create type public.content_status as enum ('draft', 'pending_review', 'scheduled', 'published', 'archived');
create type public.report_status as enum ('new', 'acknowledged', 'in_progress', 'resolved', 'rejected', 'duplicate');
create type public.report_priority as enum ('low', 'normal', 'high');
create type public.tenant_type as enum ('commune', 'epci');
create type public.tenant_status as enum ('onboarding', 'active', 'suspended');
create type public.tenant_plan as enum ('pilot', 'standard');
create type public.waste_type as enum ('household', 'recycling', 'glass', 'biowaste', 'bulky', 'green');
create type public.sorting_bin as enum ('household', 'recycling', 'glass', 'biowaste', 'bulky', 'green', 'dechetterie', 'other');
create type public.event_category as enum ('culture', 'sport', 'association', 'municipal', 'youth', 'other');
create type public.procedure_category as enum ('civil_status', 'town_planning', 'elections', 'family', 'social', 'associations', 'other');
create type public.procedure_kind as enum ('link', 'phone', 'email');
create type public.place_source as enum ('manual', 'osm', 'irve', 'csv');
create type public.wheelchair_access as enum ('yes', 'limited', 'no', 'unknown');
create type public.report_event_kind as enum ('status_change', 'comment', 'assignment');
create type public.visibility as enum ('public', 'internal');
create type public.reviewable_entity as enum ('post', 'event');
create type public.review_action as enum ('submitted', 'approved', 'rejected');
create type public.audit_action as enum ('create', 'update', 'delete', 'transition', 'invite', 'permissions', 'disable', 'enable', 'upload', 'reorder', 'send', 'platform_access', 'import_osm', 'import_irve', 'import_csv', 'tenant_exported');
create type public.store_publication_status as enum ('not_started', 'accounts_pending', 'in_review', 'published', 'rejected');
create type public.push_platform as enum ('ios', 'android');
create type public.notification_status as enum ('scheduled', 'sending', 'sent', 'failed', 'cancelled');
