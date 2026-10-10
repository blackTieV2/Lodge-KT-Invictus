# Project status — Cloudflare-only target, local backup copies only

Checkpoint: 10 October 2026. Current stage: hosting correction QA / deployment authorisation.

Explicit owner decision: "entirely cloudflare and git only, with local replication ONLY for backups". This supersedes the previous home-lab runtime and local-file delivery. No repeat intake/design approval is needed. The home lab stays internal; local replication is not hosting or live bidirectional data sync.

Starting verified main: `851626f97352132525d881208df89bfcbb9ddd95`; isolated work branch `feature/cloudflare-only-backups`. Repository was PUBLIC at recon and visibility was not changed. No private data was retrieved, altered or published for this change. A local clone attempt failed at DNS before checkout; repository changes use isolated Git objects via the connected API, not a user working tree.

## Changed

- One Cloudflare Workers Custom Domain: invictus.layer-8-labs.com; D1 is the live database, existing Access/role checks stay in place.
- workers.dev and preview URLs disabled; authenticated Worker runs before assets.
- Read-only account/zone/DNS/Worker ownership preflight; refuse conflicting DNS records and other-service takeover.
- Cloudflare deployment workflow is primary again, main/manual only, with production secrets and serial execution. No self-hosted runner.
- Removed automatic home-lab image publication. Existing historical image/source/test work was not erased or deployed.
- Canonical context, README and backup-only policy corrected. Existing member UI, API and schema unchanged.

## Verification boundary

Ten new target/preflight/probe tests passed in the preparation runtime, with Node 22.16.0. They test the fixed Custom Domain, disabled alternate URLs, ownership checks, protection against DNS overwrite and anonymous-probe classification. These are synthetic tests, not a live Cloudflare deployment. The PR's CI, existing real-browser tests and actual Worker dry-run must be checked separately before reporting success.

## Not yet completed

Cloudflare production account authorisation in hosted CI; deployment and real login/denied-user/save/reopen tests; initial protected private data load. No published Invictus site is claimed. No home-lab host, DNS, firewall, Tunnel or reverse proxy was changed.

Backup replication is a specified requirement, NOT a running job at this checkpoint. Its collector, schedule, encrypted export storage, local destination/key custody and restore rehearsal remain to be implemented/configured. D1 revision snapshots alone are not independent backups. Code replication and database export must both be covered; failure/staleness reporting and no deletion propagation are required.

## Next action

Authorise the Cloudflare account to the GitHub production workflow with the scoped deployment token, account ID and officer-role secret; deploy solely to the selected Custom Domain. Then initialise the protected cloud register and establish one-way encrypted cloud-to-local backup collection. Skip all previous SSH/Docker-host prompts. No local officer-side app or routine file handover is part of the product. Never paste tokens into chat or Git files.
