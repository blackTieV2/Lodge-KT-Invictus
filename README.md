# Invictus · Online Register

**Selected address: `https://invictus.layer-8-labs.com`. Open the website, sign in, and use one shared register. No app, scripts, local server or routine file imports on an officer's computer.**

## Home-lab hosting

The owner selected the existing home-lab domain. `Dockerfile` and `homelab/` now run the existing online interface and API on a home-lab Docker server, using a persistent SQLite volume instead of Cloudflare D1. See [the hosting-side deployment guide](deploy/homelab/README.md) and [current verified status](PROJECT_STATUS.md).

The app remains small: Brother Knight search; membership, evidence, KOL and finance statuses kept separate; source-qualified notes; Registrar/Treasurer follow-ups; proposed GP costs; change history; role-appropriate online edits. All officers use the same hosted database. Concurrent stale edits are rejected rather than overwriting another person's changes.

The existing signed Cloudflare Access login/role checks remain in place. Access protects sign-in; the app verifies the signed assertion and enforces its own officer permissions. A plain DNS record or Traefik route alone does not provide that login. The home-lab target and identity route need live confirmation before claiming the site is ready; missing configuration or missing authentication does not expose the register.

## Hosting-side delivery

GitHub's `Home-lab register checks` builds/tests the Docker image with synthetic data, verifies non-root/read-only operation and checks records survive container replacement. `Publish tested home-lab image` builds/tests/publishes a code-only image on relevant pushes to main (also manually dispatchable). The workflow reports the immutable image digest; deploying that image requires authorised access to the actual hosting server. It does not deploy to the home lab merely by publishing.

The Compose template uses an existing verified Traefik ingress network and HTTPS resolver, mounts private Access configuration, publishes no host port, and never mounts the Docker socket. No server address, network name, TLS resolver or tunnel has been guessed or applied. These deployment actions belong on the hosting service, not the user's PC.

Initial data is loaded once by an authorised administrator/maintainer after real sign-in and protection checks. The runtime does not automatically replace an existing database from Git. No production dataset is bundled into the image. Thereafter officers simply open the site and save online.

## Privacy and rule authority

The owner intends to make the repository private. Verify that live before committing real source documents; keep all real records, accounts, private screenshots, secrets and backup files out of public Git history and CI output. Both the container build context and published web assets use explicit code-only allowlists. Repository privacy and website access control are separate.

The Statutes of Great Priory of England and Wales and its Provinces Overseas govern the rules. This is a working status register, not statutory adjudication, official KOL integration or an accounting ledger. A payment promise is not a receipt; saving a correction does not post to the Treasurer's books, update KOL, send a message or approve membership. Keep evidence and unresolved qualifications visible.

## Recovery

The database retains the last 60 revision snapshots and a separate server audit. The home-lab runtime additionally creates consistent, verified standalone SQLite backups at startup and every six hours, retaining 28. Default backup storage remains on the same host; establish an authorised off-host backup and a real restore exercise before relying on this as the sole operational record. Original sources remain necessary.

## Prior Cloudflare-only build

`server/worker.mjs` and the Cloudflare deployment scripts remain for regression/portability. The legacy deployment workflow requires explicit `INVICTUS_DEPLOYMENT_TARGET=cloudflare` configuration; it is not the selected home-lab delivery. The portable local-file interface under `app/` is retained only as previous work/core regression code. Do not deliver it again as the user-facing solution.
