# Project status — home-lab hosting

Checkpoint: 9 October 2026. Task: adapt the existing hosted register to the owner's home-lab hosting choice.

Authority: "Ok. Done. Continue with everything you can do" after accepting `invictus.layer-8-labs.com`. No repeat intake/design approval. No local app/files/commands are required on officers' computers.

Starting main: `ed7edcc33a805645e89edc26f5d349103d278570`; isolated branch: `feature/homelab-hosting`. Source recon confirmed the previous build was Cloudflare Worker/D1-only. Repository still public; no private data was uploaded and visibility was not changed on the owner's behalf. A read-only external browser probe returned ERR_EMPTY_RESPONSE, not an app or sign-in page. Internal DNS/actual ingress state remains unverified.

Added: server-side Docker runtime, persistent SQLite adapter reusing the existing schema/API, canonical HTTPS/Host protection, private mounted authentication configuration, standalone verified backups, Traefik-compatible Compose, code-only image build/publish workflow and real HTTP/persistence/recovery tests. Existing frontend/authentication/Worker business logic and underlying membership data model remain unchanged.

Local preparation: the original core/auth/Worker/schema files matched their Git blob hashes. Fourteen new home-lab tests passed over real loopback HTTP/file-backed SQLite, covering restart persistence, role checks, forged identity, conflict rejection, source isolation, transaction rollback and backup restoration. A backup sidecar/retention issue found in the first test run was fixed and retested. Docker is not installed in the preparation runtime; container build/replacement tests must be read from the actual GitHub CI result. Prior CI success is not a result for this new head.

Not completed: home-lab server/Portainer access, confirmation of the selected backend and ingress/identity settings, deployment of a running container, permitted/denied real officer login, initial private data load and live save/reopen checks. No home-lab DNS, firewall, reverse proxy or existing service was changed. The included image-publication workflow does not deploy to the home lab.

The existing Access JWT verifier remains mandatory. Plain DNS/Traefik without that authenticated ingress is insufficient. Configure the selected login path before launch, rather than disabling authentication. Backups are currently same-host by default; off-host disaster recovery remains a deployment requirement. Source originals and original register remain retained separately.

Next safe action: finish and verify new CI, verify the automatic main-branch code-only image publication, then obtain the actual backend/management route and perform the authenticated deployment. Check repository privacy again before any private archive/seed handling. Read deploy/homelab/README.md and stages/03-design/HOMELAB-HOSTING.md.
