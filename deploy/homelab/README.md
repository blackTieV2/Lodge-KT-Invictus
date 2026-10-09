# Hosting-side deployment: invictus.layer-8-labs.com

This runs on the home-lab server, not an officer's desktop. The everyday experience remains: open the HTTPS URL, sign in, use the shared register. No local app, user-side scripts, repeated file imports or file handover.

## Implemented topology

`Browser -> approved HTTPS/Access ingress -> home-lab Docker container -> persistent SQLite volume`

The existing frontend, signed Access verification, role permissions and conditional-write API are reused unchanged. The Docker runtime substitutes a local persistent SQLite adapter for Cloudflare D1; Cloudflare Workers/D1 hosting is not required. This does **not** remove the existing Cloudflare Access identity requirement. A DNS record and plain Traefik route alone will not provide sign-in. Direct requests without a valid signed Access assertion are deliberately denied.

Keep the sign-in service in front of this hostname. An Access-protected Tunnel can connect to the approved home-lab ingress/origin; configure the original Host header and validate the application audience. Do not introduce an unsigned trusted-email-header bypass. If the intended ingress uses a different identity provider, adapt and test that provider before launch rather than disabling authentication. No Access/Tunnel configuration or identity-provider availability is presumed to have been verified.

## What is prepared

- `Dockerfile`: Node 24 server image, non-root, no application dependencies to install on user PCs.
- `.dockerignore`: build inputs denied by default; private records, secrets and Git history excluded.
- `compose.yaml`: existing Traefik ingress integration, no published host port or Docker socket, dropped capabilities, read-only root, separate data/backup volumes and bounded logs/resources.
- Private configuration mounted as a secret file, not committed or embedded in an image.
- `/healthz`: minimal liveness only; it does not prove authentication or initial data readiness.
- Database migrations tracked by checksum; schema drift or an unsupported downgrade stops startup.
- Online snapshots backed by a consistent SQLite backup on startup/every six hours; 28 standalone backups retained. Each is verified and stored with restrictive permissions. These default volumes are still on the same host: add an authorised off-host backup/retention policy before relying on them for disaster recovery.
- `Publish tested home-lab image`: GitHub-hosted build/test/publish workflow on relevant main-branch pushes, also manually dispatchable. No self-hosted runner executes untrusted PR code. It publishes code only and never deploys or changes home-lab settings itself.

## Remaining deployment inputs — do not guess these

Confirm the actual application host, reachable management route, ingress network, HTTPS entrypoint/certificate resolver and signed-login path. Historical home-lab documents describe Traefik/Docker, but are not a live configuration read.

The included Compose is for a Docker host attached to the existing ingress network. If the app server is separate from the ingress host, use an approved private backend route instead; do not attach a guessed network, expose a new WAN port or move the app onto a control-plane host without checking.

Set in the hosting manager, privately:

- `INVICTUS_IMAGE`: immutable digest reported by the successfully completed image workflow.
- `INVICTUS_INGRESS_NETWORK`, `INVICTUS_HTTPS_ENTRYPOINT`, `INVICTUS_TLS_RESOLVER`: verified existing ingress settings.
- `INVICTUS_ACCESS_CONFIG`: server-side path to an actual access configuration based on `access.example.json`; owner/read permissions must allow UID 1000 to read it. Placeholder issuer deliberately fails validation.

Set `ACCESS_ISSUER` and `ACCESS_AUD` for this exact Access application, and the officer email-to-role map. Do not assume statutory office names establish application login permissions. New named users must be allowed in both Access and the server map. Configuration changes require a controlled container restart; existing data volumes remain intact.

## Deployment sequence (maintainer, through authorised hosting access)

Verify current host/ingress and back up its relevant configuration. Build/test/publish the image in GitHub, configure the small dedicated stack in the hosting manager, confirm container health and reject anonymous API reads. Connect **only** the Invictus hostname through the authenticated ingress, preserving its Host header and correct origin certificate validation. Confirm HTTPS, real permitted login, rejected non-member login, a browser save/reload, and a second officer's read/role limits.

Only then initialise the reviewed working register once through the authenticated administrator endpoint/page. No real dataset is built into the image. The already prepared data can be transferred privately by the maintainer; the officers do not need daily import/export. An existing online database must never be overwritten to refresh source records. Source corrections remain reviewed business operations, not a re-seed.

Repository visibility must be checked live before any sensitive source archive is committed. A public repo may hold this code-only image definition but never the member data. A private repository does not replace website access controls. No DNS, firewall, Portainer, Tunnel, identity policy or running container has been changed merely by adding this deployment package.

## Backup / rollback

Keep `/data` on local reliable storage; do not share a live SQLite file over SMB/NFS. The configured separate `/backups` volume contains standalone consistent files, not copies of an uncheckpointed WAL database. Before an upgrade retain a verified backup separately from the host. Re-deploy a previous compatible image without deleting data volumes. The app refuses a database with later migrations absent from the older image; a schema rollback therefore requires a reviewed restore into a **new** volume, verified before switching over. Never restore over a live database or delete the volume to repair startup.

The code's tests reopen a backup as an independent database and verify state/audit. A real off-host disaster-restore exercise remains a live deployment check, not something proved by synthetic CI.

Primary technical references: Node SQLite/online backup https://nodejs.org/api/sqlite.html ; Traefik Docker routing https://doc.traefik.io/traefik/v3.3/providers/docker/ ; Cloudflare origin Access assertion validation https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ .
