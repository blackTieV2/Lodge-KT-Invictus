# Home-lab hosting adaptation

Authority: the owner selected the existing home-lab domain, accepted `invictus.layer-8-labs.com`, reported "Done" and instructed "Continue with everything you can do". No new intake approval is required. The no-local-computer requirement remains; a home-lab server is the hosting target, not a local-file user workflow.

Reuse the existing browser app, rules/financial boundaries, signed identity verifier and API. Add a production Node HTTP host adapter and persistent SQLite store using the existing schema/atomic triggers. The controlled HTTP origin is `https://invictus.layer-8-labs.com`; untrusted Host/forwarded headers cannot redefine the CSRF boundary. Publish only exact code assets. Original source records do not belong in the image.

The prior Cloudflare Workers deployment remains a legacy alternative, not the selected target. The home-lab implementation retains Cloudflare Access JWT authentication at ingress. It will not work unauthenticated solely because a DNS/Traefik route exists; whether the selected hostname is actually routed through that identity service must be established in live deployment. Do not silently invent a home-lab SSO installation, substitute a shared password or disable sign-in.

Historical Layer-8 Labs documents informed a Traefik/Docker-compatible template; they do not authorise changing the control plane or establish current host addresses/network names. Actual target host and management access are unresolved. The one external browser probe observed ERR_EMPTY_RESPONSE, not a working app; the error alone does not prove the underlying proxy/TLS cause. Repo was still public at recon, so private data stays outside it.

Acceptance is real signed-token HTTP tests, persistent storage reopen, role/conflict enforcement, recovery/restore tests, strict asset exclusion, and Docker image non-root/read-only/restart checks in GitHub CI. Independent live sign-in/network/data checks remain required after hosting access is connected. See deploy/homelab/README.md. No live deployment or unrelated infrastructure change is claimed by this design/build.
