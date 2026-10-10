# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /opt/invictus
COPY app/core.js app/styles.css ./app/
COPY web/index.html web/ui.js web/online.css ./web/
COPY scripts/build-online.mjs ./scripts/
RUN node scripts/build-online.mjs

FROM node:24-bookworm-slim
ENV NODE_ENV=production PUBLIC_ORIGIN=https://invictus.layer-8-labs.com PORT=8080 DATABASE_FILE=/data/register.sqlite BACKUP_DIRECTORY=/backups ACCESS_CONFIG_FILE=/run/secrets/invictus_access
WORKDIR /opt/invictus
COPY --from=build /opt/invictus/online-dist ./online-dist
COPY app/core.js ./app/
COPY server/auth.mjs server/worker.mjs server/action-update.mjs ./server/
COPY homelab/*.mjs ./homelab/
COPY migrations/*.sql ./migrations/
RUN mkdir /data /backups && chown node:node /data /backups
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "homelab/healthcheck.mjs"]
CMD ["node", "homelab/server.mjs"]
