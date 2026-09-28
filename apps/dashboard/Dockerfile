# Image autonome du dashboard (sortie `standalone` de Next.js) : deploiement hors Vercel possible
# (Scaleway Serverless Containers, OVHcloud… : voir docs/souverainete.md). Construire depuis la racine :
#   docker build -f apps/dashboard/Dockerfile -t mairie-dashboard .
# Les variables NEXT_PUBLIC_* sont figees au build (--build-arg) ; les secrets serveur sont fournis a l'execution.

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard
RUN pnpm install --frozen-lockfile --filter dashboard... --config.confirmModulesPurge=false
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MAP_STYLE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_PRODUCT_NAME
ENV NEXT_TELEMETRY_DISABLED=1 DATA_SOURCE=supabase
RUN pnpm --filter dashboard build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATA_SOURCE=supabase
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/apps/dashboard/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build --chown=app:app /repo/apps/dashboard/public ./apps/dashboard/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "apps/dashboard/server.js"]
