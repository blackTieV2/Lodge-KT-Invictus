# Access policy no-op hotfix

## Authority and target

Continue the owner's approved Cloudflare/GitHub-only implementation and deployment after the owner supplied successful CONFIGURE/dispatch output with three accounts. Target repository: blackTieV2/Lodge-KT-Invictus. No private values, account IDs or officer addresses are copied here.

## Recon

Read AGENTS.md, PROJECT_STATUS.md, CONTEXT.md, stages/03-design/CLOUDFLARE-ONLY.md, the current policy helper/tests and the actual deployment job. Starting main `3ceff9a3a59230c8234afc9cd1141914d7f99d6e`, tree `a137cdccff32f5c5588be7355091e21103d4c2a6`. Run `38057989325` / job `114230274158` failed at the helper's unknown-field check after 39 tests/build passed; the earlier Access POST 403 is no longer the stopping point.

A clone attempt from the preparation runtime failed DNS before checkout. Isolated script copies were tested locally; repository changes use a new API branch. No user working tree, credential or home-lab service was accessed.

## Diagnosis and change

The helper applied the writable-schema guard before deciding whether it needed to write. Creation/unchanged deployment can therefore fail merely on unfamiliar response fields. Move the equality/no-op decision after the existing ownership/Allow/include/desired-email checks but before writable-schema validation. Return body:null, changed:false when identical. Keep unknown-field rejection for any actual update. Never rebuild or replace a policy just to remove extra fields.

Response fields remain private, and their names were not logged. Fixtures use deliberately synthetic extension names. The fix does not assert those extensions are harmless: they are not changed at all in the no-op path. Server JWT and officer-role enforcement are unchanged.

## Tests and acceptance

`node --test tests/deploy-policy.test.mjs` on isolated copies: 14 tests total; baseline 8 pass/6 fail, corrected 14 pass/0 fail. Added checks for absent no-op PUT payload, immutability, preserved restrictions, changed-list unknown-schema failure, broad include rejection, shared/non-Allow refusal and invalid identities. CI must also pass the actual existing API/bundle/browser workflows before merge. Do not represent synthetic checks as live provider acceptance.

Four paths are changed: scripts/access-policy.mjs, tests/deploy-policy.test.mjs, PROJECT_STATUS.md and this packet. No production data, UI/API/schema/workflow or secret changes. Existing audit and recovery mechanisms remain untouched.

## Primary reference and next step

Cloudflare's documented policy list is a GET that returns configured policy variants; policy update is a distinct PUT. Reference checked 10 October 2026: https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/subresources/policies/methods/list/ . This patch relies only on leaving an already matching policy unchanged, not assuming undocumented fields can be dropped from an update.

After successful review/merge, dispatch a new main-branch deployment using existing secrets. Old-run retries keep the old commit. Report separately the code fix, new provider deployment outcome and real-user/data acceptance; do not claim the website live merely because this change passes tests.
