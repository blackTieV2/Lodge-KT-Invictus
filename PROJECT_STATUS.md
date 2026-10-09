# Project status — home-lab build published, deployment pending

Checkpoint: 9 October 2026. Selected address: `https://invictus.layer-8-labs.com`.

Authority: the owner's “Ok. Done. Continue with everything you can do” following the home-lab choice. No repeat intake/design approval and no local-computer app, scripts or file handover for officers.

## Completed and verified

PR #7 merged as `ad8fdb3160b97c4e0582a965e2fcc79266321d34`, from tested head `defcd64e5cdc62860921f85d581b19b2fa53b528`; starting main was `ed7edcc33a805645e89edc26f5d349103d278570`.

The home-lab runtime uses Docker/Node and persistent SQLite, retaining the existing browser UI, signed Access authentication, role checks, working-register API, conditional writes and atomic audit/snapshots. Added canonical HTTPS/Host enforcement, private mounted config, non-root/read-only container settings, code-only build allowlists, Traefik-compatible hosting template, tracked migrations and consistent verified standalone backups. No full accounting or statutory decision engine was added.

GitHub home-lab checks run `37936008232`, job `113838117029`, passed all 71 regression tests, online asset build, Compose validation, actual Docker build, private-file exclusion, non-root/read-only execution, anonymous-data protection, persistent records after container replacement and backup verification. The first container probe failed; its virtual-host test was corrected to use explicit raw HTTP Host headers, asserting both 401 and 421. Production authentication/origin controls were not weakened.

Online browser/Worker checks run `37936008224` and legacy frontend checks run `37936008211` also succeeded at the reviewed head. Automated code review completed on implementation commit `5a71704` without findings returned in the discussion; the later change only corrected the test probe. These are synthetic automated checks, not a live home-lab security assessment.

Main-branch publication run `37936267369`, job `113838989566`, succeeded. It reran all 71 tests, built and tested the actual container and pushed the code-only image. Observed immutable digest:

`ghcr.io/blacktiev2/lodge-kt-invictus@sha256:d4217a2da88baed7552bfc37a3cac89803915580fe797a5fd6f2050cc868ce4b`

Tag: `ghcr.io/blacktiev2/lodge-kt-invictus:sha-ad8fdb3160b97c4e0582a965e2fcc79266321d34`.

The registry login was removed from the hosted runner after publication. No registry visibility change or anonymous pull permission is claimed. Image publication does not install or start a home-lab container. Subsequent documentation-only commits do not change the tested image.

## Live boundary still outstanding

A read-only external browser probe returned `ERR_EMPTY_RESPONSE`, not an Invictus app or sign-in page. That error alone does not establish its DNS/TLS/proxy cause. The actual application host, reachable management route and current ingress settings have not been verified. Historical home-lab documents are leads only; no internal address, Docker network or certificate resolver was assumed or applied.

Still required: authorised access to the selected hosting server/manager, verification of the hostname's proxy/tunnel target and signed login path, container deployment, permitted/denied real officer login, protected initial register load, live save/reload and second-officer checks. Host/image compatibility and registry pull access must also be checked at deployment. No DNS, firewall, reverse proxy, Tunnel, Portainer configuration or existing running service was changed.

The existing Cloudflare Access JWT verifier remains mandatory. This container removes Cloudflare Workers/D1 hosting dependence, not the sign-in requirement. Plain DNS/Traefik without authenticated ingress is insufficient; never work around it with an unsigned email header or disabled login.

Repository was rechecked PUBLIC after image publication. No real membership files, source documents, credentials or private screenshots were committed or included in the image. User retains responsibility for their intended visibility change; verify it again before any private archive. The prepared private register and original sources remain separate, unmodified. No official KOL, financial posting, membership decision or outgoing correspondence was performed.

Recovery design: last 60 revision snapshots plus consistent standalone backups at startup/every six hours, retaining 28. Default backups remain on the same host; an authorised off-host backup and live restore exercise remain required before sole operational reliance.

## Next safe action

Obtain the actual home-lab application host and management endpoint, inspect the hostname's proxy/tunnel configuration, and deploy the published image through authorised hosting access. Do not request another product approval or send another local ZIP. Read `deploy/homelab/README.md` and `stages/03-design/HOMELAB-HOSTING.md` for the already prepared host-side configuration.
