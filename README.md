# Invictus · Online Register

**Open a website, sign in, and use the shared register. No local server, ZIP, command line, or daily file import/export is part of the product.**

The owner's 9 October correction supersedes the previous local-file delivery and PR #5. The small scope is unchanged: quick Brother Knight lookup, separate membership/KOL/account positions, notes, Registrar/Treasurer follow-ups and proposed GP costs. What changes is hosting and persistence.

## Hosted application

Cloudflare Workers serves `web/` on a provider-issued `workers.dev` URL; no purchased domain is required. Cloudflare Access provides sign-in. A private D1 database stores the working register. Saves include a version check, server identity and timestamp, an audit entry and a recovery snapshot. Other open screens refresh every 30 seconds and when brought to the foreground; an open form is not silently replaced.

Role permissions are checked on the server: administrator; Registrar for membership/KOL fields; Treasurer for financial fields; viewer for read-only use. No shared password or self-declared operator identity. The origin verifies the Access JWT as well as relying on the login gate. Missing setup fails closed.

The app is implemented but is **not a deployed website until Cloudflare account authorisation, deployment and authenticated smoke checks have completed**. See PROJECT_STATUS.md for the current verified checkpoint, not an assumed URL.

## Deployment is hosted, not local

The `Deploy online register` GitHub Actions workflow runs on `main`. It needs these secrets configured through authenticated account administration: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `OFFICER_ROLES` (a JSON map of approved lowercase email addresses to roles). Never paste secret tokens into chat or commit them.

The setup script reuses or provisions the dedicated D1 database and Access application, applies the schema, builds/deploys the protected Worker and checks anonymous access. It does not alter other websites or purchase a domain. Existing Access policies are preserved rather than overwritten. Zero Trust and the provider subdomain must exist in the authorised account.

The administrator/maintainer handles the initial data load once. Afterwards the officers do not load files. An optional `private/register.json` seed is accepted by deployment only after a live GitHub check confirms this exact repository is private; existing online data is never overwritten. Initialisation through the authenticated admin page is also supported.

## Private source records

The owner will make the repository private. Do not add real data before that visibility change is verified. A private code repository does NOT itself make a hosted website private. Website sign-in is separate and remains enabled regardless of repository visibility.

After the repository is verified private, authorised source documents may be archived under `private/` and the reviewed seed prepared there. The build publishes exactly five allowlisted code files, never the repository root or `private/`. Minutes, summons, forms and accounts must not enter public Git history, public CI output or public release artifacts.

## Boundaries

This remains a working status register, not an accounting ledger or statutory decision engine. Saving a note does not change KOL, post a payment, send a message or confer membership. The Statutes of Great Priory control the rules. Source qualifications and original ledger values are retained. Existing `app/` local-file code is legacy only, retained for regression tests; it is not the user-facing delivery.

The last 60 saved versions are retained in D1 for recovery; the server audit is retained separately. These same-account recovery snapshots are not an independent disaster backup. Configure provider recovery/independent exports before relying on this as the only record. Historical private source originals remain necessary.

## Maintainer checks

`node --test tests/online.test.mjs` checks auth, permission boundaries, concurrency and SQLite transaction/trigger behaviour. `node scripts/build-online.mjs` makes the allowlisted assets. `python tests/online_browser.py` exercises the browser against the synthetic HTTP adapter. CI also validates the actual Worker bundle. None of those commands is required on an officer's computer.
