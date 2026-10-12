# Project status — officer Access-policy compatibility repair

Checkpoint: 12 October 2026. Production remains Cloudflare Workers/D1/Access at invictus.layer-8-labs.com, with GitHub code/deployment and local replication for backups only. The action-first application was deployed at 30588982e9b91f21a75d7f74413fa0e6964cb5e8 in run 38068884340; the owner has populated the private register. Do not re-import or reset data.

## Current authorised task

The owner explicitly requested adding the Provincial Registrar using the existing registrar role. They saved the four-account OFFICER_ROLES production secret and requested deployment run 38205667121. The PowerShell setup completed. Deployment job 114668491681 passed 47 tests/build and then stopped in access-policy.mjs on an unknown response field, BEFORE the Access policy update, database step or Worker publication. Do not recreate credentials or repeat the role setup.

## Verified cause and repair

Starting main: 30588982e9b91f21a75d7f74413fa0e6964cb5e8. Isolated repair branch: fix/access-policy-shape. A read-only, branch-scoped diagnostic used the existing production credentials, logging ONLY top-level field names/types and booleans. Run 38206000441 identified uid as the extra field. Run 38206342910 confirmed uid equals id and the fixed mapper can construct the requested officer update. Neither run performed a provider write or touched membership data. No account/email/token values were published.

The mapper now recognises uid only as matching identifier metadata, excludes it from the PUT body and rejects conflicting/malformed aliases. Unknown security fields still stop real writes, and all existing restrictions/shared-policy guards remain. The deploy script re-reads and verifies the officer list and preserved writable policy settings after a write before continuing to publish the Worker role map. No authentication verifier, application UI, role semantics, schema, data, global branding, other project or DNS configuration was modified.

The temporary diagnostic workflow/script are removed from the final tree. Five deliverable paths only: policy mapper, deployment verification hook, policy tests, this status and the run record. Baseline module/test/deploy bytes were matched to Git blob hashes before editing. Local policy tests: 22 passed, including all prior 14 tests plus UID and read-back regressions; JavaScript syntax checks passed. Full current-head CI/review and merge must be observed before deploying. No new product approval is needed for this requested account repair.

## Remaining live check

The repaired build is not yet deployed at this checkpoint. Deploy the tested merged-main code using the already stored credentials, then verify the actual policy read-back/Worker publication and ask the new officer to use email-code login. Do not claim a live login on another person's behalf. Provider policy update and Worker publication are separate operations, so a later deployment failure requires inspecting both states rather than blindly rerunning setup. Never weaken sign-in to work around this.

Backup activation and independent restore remain separate pending work. Private records stay outside the public repository. The canonical manual deploy workflow remains unchanged; a bounded recovery execution must use verified merged-main source and the existing production environment, not unreviewed PR code.
