# Cloudflare-only production; local backup replication

Authority: explicit owner selection on 10 October 2026: entirely Cloudflare and GitHub, local replication only for backups. This supersedes REGISTER-DESIGN.md's local-file delivery and HOMELAB-HOSTING.md's server-hosting assumption. No extra approval gate is created for the already instructed correction.

Production: browser -> Cloudflare Access -> Workers UI/API -> D1. The Custom Domain invictus.layer-8-labs.com points to the Worker itself, with no home-lab origin. GitHub-hosted Actions performs controlled main-branch deployment. App/core validation, web UI, server auth/roles/conditional saves and existing schema are reused unchanged.

Protect every path through the authenticated Worker. Disable workers.dev and preview URLs. Before provisioning, verify the selected account owns the active zone, inspect exact hostname DNS and Worker bindings and stop on conflicts rather than delete records or steal another service's route. Apply only the named app's officer policy while preserving existing MFA/exclusion settings. Signed identity remains mandatory regardless of repository privacy.

The deployment workflow remains manually triggered until production authorisation is installed and live checks pass. A successful test or PC OAuth login is not a production deployment. The helper's anonymous denial/Access-redirect check is necessary but not sufficient: real permitted/denied officer login, D1 read/save/reopen and cross-user tests remain the release checks. Initial data must not be loaded on an unverified open endpoint; optional Git seeding requires a live private-repository check and never overwrites an existing register.

Local replication is a one-way backup pull only. No listener, port forward, Tunnel, hosted runner, automatic failover or upstream editing sync. D1 exports must include the actual data/audit/recovery state; repository backups must include code/history/configuration; original private evidence requires its own protected archive. All encryption credentials stay outside Git. Detailed requirements and unimplemented status: docs/BACKUP-ONLY.md.

Rollback deploys a prior Cloudflare Worker version without resetting D1. Database restore is a separate authorised operation, preferably rehearsed against an isolated cloud database first; do not automatically restore on restart. Stopping local backup equipment must leave production fully functional.

Primary references checked 10 October 2026:
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/
- https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/
