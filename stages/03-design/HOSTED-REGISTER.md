# Hosted register — implemented correction

Authority: owner's 9 October 2026 instruction rejects local operation and directs "Fix it". This supersedes local-only delivery assumptions. Scope: reuse the small working register, add only what makes it a securely hosted multi-officer app. No extra design approval gate is inserted.

## Runtime

Cloudflare Workers, provider workers.dev hostname, Access sign-in, D1 online storage. Static assets run through the Worker before serving; the Worker verifies the Access assertion signature, issuer, application audience, time claims and officer role. No authentication bypass exists in production; only a test HTTP adapter supplies synthetic signed tokens. Account configuration absent or invalid fails closed. Preview URLs are disabled.

OFFICER_ROLES is a private deployment secret. Administrator can initialise and maintain all working fields; Registrar maintains membership/KOL; Treasurer financial summaries; viewer reads only. Original ledger/source snapshots cannot be rewritten through normal editing. Local attribution is replaced by verified server identity. App permissions are administrative controls, not statutory authority.

## Persistence and conflicts

For this small register, keep the existing v1 summary document in one D1 row rather than building a full accounting database. Each mutation is a bounded operation, not an arbitrary full-file replacement. If-Match is required. A conditional SQL update and its audit/snapshot triggers commit atomically; stale edits receive 409 with no change. Simultaneous writes do not lose data. Individual clients preserve an open draft after a conflict; they do not auto-retry or silently merge.

Each successful mutation creates a server audit record and recovery snapshot. Latest 60 snapshots are retained; the separate audit is not editable via API. The private document carries the most recent 1,000 convenience history events; older authoritative server audit remains accessible, and original imported history is identified as imported. Audit contains actor, time, changed-field summary and stated reference, not certification. Same-account snapshots are not off-account backups.

## Interface

Normal start: authenticated online load, no file picker. Search/filter, person summary, role-appropriate editing, Registrar/Treasurer queues, proposed GP costs, history and administrator recovery snapshots. Save online explicitly confirms success or shows a failure/conflict. Online data refreshes every 30 seconds/foreground when no form is open; open forms are preserved. No production-data localStorage or offline browser copy is used. Initial admin seeding happens once, outside routine officer use.

## Privacy and initial data

User will make repository private. No sensitive files are added while public. Once private status is verified, authorised records may be archived under private/; assets remain an explicit five-file code allowlist. Deployment's optional seed checks current repository privacy using the GitHub API and uses INSERT ON CONFLICT DO NOTHING; it never overwrites a working database. An authenticated administrator can initialise through the protected app instead. Real seed was NOT committed in this build.

## Deployment and rollback

GitHub-hosted workflow, main only, production environment, serial deployment. Credentials and the officer map are configured privately in account administration. Script sets up only the named Worker, D1 database and Access hostname, preserving existing Access policies. It checks anonymous access before optional seed. No domain purchase, other-site changes or paid-plan acceptance. Authenticated denied-account/read/save/reload checks must pass before claiming the site ready.

Rollback code via previous deployment while preserving D1. Recover a data snapshot only after review; do not reset official KOL history. Required before sole reliance: provider recovery and an independent backup destination/restore test. Current code includes same-account recovery snapshots, not that independent backup.

## Verification

API/auth tests use signed synthetic RS256 assertions and actual SQLite transactions/triggers via a D1-shaped adapter. Browser tests use a synthetic HTTP server; GitHub CI runs real browser navigation and a Wrangler dry-run. The restricted preparation runtime uses the disclosed in-memory DOM/HTTP-bridge mode; it does not claim live Cloudflare login or actual production D1 verification.

Official implementation references: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ ; https://developers.cloudflare.com/workers/static-assets/routing/worker-script/ ; https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ ; https://developers.cloudflare.com/d1/worker-api/prepared-statements/ . Private GitHub Pages visibility is a separate feature, not granted merely by making a repository private: https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site .
