# Current context — Cloudflare and GitHub only

10 October 2026 explicit owner instruction: "entirely cloudflare and git only, with local replication ONLY for backups". This supersedes the home-lab runtime assumption and earlier local-file delivery. Do not ask for another architecture approval, a Docker host, SSH, Traefik, home IP or Tunnel.

Read AGENTS.md, PROJECT_STATUS.md, stages/03-design/CLOUDFLARE-ONLY.md and docs/BACKUP-ONLY.md. Selected production address remains invictus.layer-8-labs.com. Cloudflare Workers runs the UI/API, D1 owns live state, Access handles sign-in, and GitHub owns code and deployment automation. Reuse web/ and server/; no frontend rewrite or schema migration is required.

Local copies are backup-only, one-way cloud-to-local, versioned and encrypted, never authoritative editing stores or runtime dependencies. Backup collection may initiate an outbound authenticated connection; nothing opens inbound access to the lab. The old Docker image publication workflow is removed; source/tests are retained for history and regression only.

Application/hosting implementation is authorised. Deploying requires scoped Cloudflare authorisation available to GitHub Actions; the observed PC Wrangler login is not that grant. No provider authorisation or live deployment is assumed. No private records, DNS changes or infrastructure changes have been made by this checkpoint.

Statutes remain controlling authority; preserve source uncertainty. Real records must stay outside the public repository. User intends to change visibility; verify it live before any private source archive. Backups must be actually scheduled/tested before reporting them operational.
