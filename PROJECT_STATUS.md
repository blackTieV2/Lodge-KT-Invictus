# Project status — hosted correction

Date: 9 October 2026. Current stage: QA / hosting authorisation.

The owner explicitly rejected local use and instructed the hosted correction. This supersedes local-only intake/design/handover holds and PR #5's delivery assumption. Small hosted app implementation is authorised; no new product approval is required.

Starting main: `23b03a67bcbdba19a9b872c1fcd524b6764d01b9`. Build branch: `feature/hosted-register`. Repository verified public at recon; visibility left for the owner to change as instructed.

Implemented: hosted browser interface, Cloudflare Worker API, verified Access login and server role checks, shared D1 storage, conditional writes, audit and 60 recovery snapshots, code-only asset build, hosted deployment workflow and synthetic tests. Existing local application/core was preserved; no real records were added to GitHub.

Preparation checks: 23 API/auth/concurrency/transaction tests passed. Online asset build passed. Browser save/reload, second-user reads, role controls, conflict draft preservation and mobile layout passed in the explicitly labelled in-memory DOM/HTTP-bridge mode. Full browser navigation is blocked in the preparation runtime. GitHub CI provides the real browser and Wrangler-bundle checks; read its result live before claiming success.

Not yet completed: authenticated Cloudflare account connection, production deployment, actual Access login/denied-account smoke check, private dataset initialisation and actual D1 round-trip. No live URL has been established. Do not describe an implemented build as a published service.

Deployment requires account authorisation plus the privately configured officer allowlist. No authenticated Cloudflare browser context or deployment credential was available at recon. GitHub code access does not grant Cloudflare account access. No local user commands are required; all deployment scripts run in hosted CI.

Remaining prohibitions: no domain purchase, no publication of private data, no official KOL/account actions, no changes to unrelated services. Privacy verification is required before adding private source files. Authentication and anonymous-access checks must be verified before loading real data. Same-account recovery snapshots do not replace an independent disaster backup.

Next action: finish CI/review, then authorise the existing Cloudflare account and deploy through the hosted workflow. After the owner makes this repo private, verify that live state and load the already prepared reviewed register privately. Do not send another local ZIP or ask for another intake approval.
