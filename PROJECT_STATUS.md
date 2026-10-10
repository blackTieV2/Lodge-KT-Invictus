# Project status — authorisation configured; Access no-op deployment fix

Checkpoint: 10 October 2026. Production remains entirely Cloudflare Workers/D1/Access at invictus.layer-8-labs.com, with GitHub source/deployment. Local replication is backup-only. No home-lab hosting, listener, SSH, Tunnel or local officer application.

## Verified starting state

Main: `3ceff9a3a59230c8234afc9cd1141914d7f99d6e`, with Cloudflare-only PR #8 and setup/backup PR #9 merged. The owner has run Configure-Cloudflare.ps1 again with a replacement token, three sign-in accounts and explicit CONFIGURE confirmation. Secret values were not retrieved or published; do not request token creation or repeat configuration solely because deployment failed.

Actual GitHub deployment run `38057989325`, job `114230274158`, used this head and reached the Access policy reconciliation after the earlier 403 failure was resolved for that step. All 39 predeployment tests and the five-file online asset build passed. The job then stopped at `scripts/access-policy.mjs` with `Unknown Access policy settings require review before an update.` This is a code guard failure, not evidence of a further missing token permission. D1 creation and Worker deployment occur after that line and were not reached by this run.

The log suppresses policy response contents. The specific additional field names are not known and must not be guessed or copied into fixtures as alleged production evidence. Repository was still public in the run metadata. Real register/source documents remain outside GitHub.

## Bounded correction

Branch: `fix/access-policy-noop`, based on starting main above. Continue the already approved build/deployment; no architecture or product approval is reopened.

The policy planner now checks policy identity, scope, Allow decision and exact email-only include list first. When the desired officer list is already identical, it returns a no-op with no PUT body. Every provider field and restriction remains untouched. Unknown response fields therefore cannot prevent a read-only no-op. When an officer list actually needs changing, the strict unknown-field guard remains, and supported MFA/exclusion/approval/session settings are preserved. Shared, ambiguous, broad-include and non-Allow policies remain blocked.

Changed application code is limited to this deployment helper, with eight added regression tests. No UI, API, authentication verifier, role map, database schema, workflow triggers or secret values were modified. A fresh deployment must run the corrected main revision; retrying the old workflow SHA would execute the old bug.

## Validation and execution boundary

The original six policy tests plus eight new synthetic tests were run against a separately prepared copy in the assistant's container on Node 22.16.0: the old helper failed six of fourteen checks; the corrected helper passed all fourteen. The attempted Git clone failed DNS before a checkout existed; no full local repository test run or user-worktree change is claimed. GitHub CI results and commit comparison must be read live before reporting this patch merged/verified.

No live Cloudflare change was made by preparing this correction. The failed user-triggered run reached policy validation; that is not a successful production launch. Worker deployment, real sign-in, protected data initialisation, live save/reload and cross-officer checks remain required. No new backup schedule was activated; PR #9's exporter/collector and synthetic encryption/restore tests remain delivered code, not evidence of a real D1 backup/local receipt.

## Next action

After tests and merge, request a NEW run of deploy-online.yml on main using the already stored production secrets. Do not re-run the old SHA, re-enter the token, change unrelated Cloudflare tokens, or request home-lab configuration. Verify the new run and live Access entry point, then proceed to private register initialisation and backup activation when their separate privacy/key/destination requirements are met.
