# Invictus · Cloudflare Online Register

**Cloudflare and GitHub only. Local replication is for backups only.**

Approved address: `https://invictus.layer-8-labs.com`. The Worker is the origin, not a proxy to a home-lab machine. The live register is Cloudflare D1. Officers open the site, sign in through Cloudflare Access and save online. There is no local app, server, routine import/export, Docker host, SSH dependency, home-lab Tunnel or port forwarding.

This is the owner's explicit 10 October 2026 correction. It supersedes all local-file and home-lab hosting directions. No further product-scope approval is needed. See PROJECT_STATUS.md for what is actually deployed; repository changes alone are not a live website.

## What stays small

The existing web interface and Worker API are reused: search Brother Knights, inspect separate membership/KOL/financial positions, source-qualified notes, Registrar/Treasurer follow-ups, proposed GP costs and change history. Signed authentication, server role controls and conditional versioned saves remain unchanged. A new full accounting system or AI service is not part of this project.

## Cloud deployment

`Deploy Cloudflare-only register` is a manual GitHub-hosted workflow on main. It requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `OFFICER_ROLES` as private production secrets. A Wrangler login on an administrator's PC does not authorise GitHub Actions; never publish an OAuth token file or paste credentials in chat.

The script verifies the active zone/account and that the hostname is vacant or already assigned to this Worker. It refuses to overwrite an existing DNS record or take another service's hostname. It creates/reconciles only this app's Access policy, reuses/provisions D1, deploys to the single Custom Domain and verifies anonymous access is denied. Existing MFA/exclusion requirements are preserved. Other DNS records and all home-lab infrastructure are untouched.

`workers.dev` and preview URLs are explicitly disabled. Code assets are an allowlist; source documents and the repository root are not served. Cloudflare manages the Custom Domain DNS/certificate; no home IP is required. Finish actual allowed/denied login, save/reopen and second-officer checks before calling the site ready.

The initial private register can be loaded once by the authorised administrator after protection checks. The optional private/register.json seed is accepted only after live repository-privacy verification and never overwrites an existing online database. Officers never manage local files during normal use.

## Backups, not a second live system

GitHub is the code/configuration source; D1 is the live data store. A Git clone is not a database backup. The local copy will be a one-way, versioned, encrypted backup pull of cloud database exports plus a separate Git repository mirror. It will not serve traffic, synchronise edits back, or become automatic failover. Home-lab downtime must not affect the site.

The backup policy/acceptance requirements are in docs/BACKUP-ONLY.md. Scheduling, credentials, encryption-key custody, destination and a verified restore still need to be configured; this change does not claim backups are running. Existing D1 revision snapshots are same-account recovery history, not an independent backup. Protect and preserve original source documents as well as the structured register.

## Privacy and authority

The owner will make the repository private. Until verified private, no real member data, minutes, summons, account records, private screenshots or backup payloads may enter Git history or CI artifacts. Website access protection remains necessary even with a private repo. Secrets never belong in Git, including after visibility changes.

The Statutes of Great Priory of England and Wales and its Provinces Overseas govern membership rules. This app maintains a working status register; saving does not update KOL, post to official accounts, send correspondence or certify membership.

## Previous work

Legacy Docker/home-lab code and tests are retained as historical code, not the deployment path. Automatic home-lab image publication has been removed. Previously published images were not deleted. Earlier local-file instructions and home-lab hosting documents must not be used to direct current deployment.
