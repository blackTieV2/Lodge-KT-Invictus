# Project status — sign-in bug reproduced and corrected; redeployment required

Checkpoint: 10 October 2026. Production is Cloudflare Workers/D1/Access at invictus.layer-8-labs.com; GitHub owns source/deployment. Local replication is backup-only. No home-lab app, listener, SSH, Tunnel or offline officer workspace. The already approved bugfix/deployment scope remains active; no new product approval is required.

## Live baseline and symptom

Main/deployed source at recon: `0d7bc9518c7b3c358828af60ab9de8aeea7e186f`. Successful deployment run `38058646398` / job `114232196909` applied the D1 schema and deployed the Worker/code-only assets. It checked the Custom Domain and anonymous denial, not a completed officer login.

The user reached the correct Invictus Access application, completed email-code sign-in, then received `Sign-in verification is temporarily unavailable.` at the Invictus origin. The response comes from the Worker's signing-key retrieval block. The old code requested `redirect:'error'`; native workerd rejects that option before any outbound fetch, leading to the generic 503. Existing Node tests mocked fetch and the bundle dry-run did not execute this path.

## Verified correction

Branch `fix/workerd-access-key-fetch`, PR #11. Executable/test head `dcebc944e01325cf3efc68f2f8c8e5b8dcf73057` based on the deployed source. Production change: the single JWKS-fetch redirect option becomes `manual`. The response is still rejected unless successful, so redirects are never followed. Trusted issuer endpoint, timeout, key-id match, cryptographic signature, issuer/audience/time validation and officer-role enforcement are retained. No authentication bypass, embedded keys or stale-key acceptance was added.

New `tests/auth-workerd.test.mjs` and `auth-runtime-checks.yml` run the actual auth module using native workerd Request/fetch/Web Crypto. Only the outbound transport is replaced with synthetic signing-key responses. Configuration follows the actual schema in the deployment-pinned Wrangler 4.149.0 toolchain, not obsolete README examples.

GitHub native-runtime run `38064859106`, job `114250336954`, completed successfully; its full log was read. All 20 tests passed. The original `redirect:error` option reproduces the exact 503 with zero outbound requests. The corrected option validates genuine synthetic RS256 signatures. Other tests confirm role assignment, cached signature revalidation, tamper rejection, no credential forwarding, rejection of 301/302/303/307/308 and 403/500 key responses, invalid JSON recovery, unknown key rejection, unlisted-account denial, and wrong issuer/audience/expired/missing-token denial.

All six PR workflows passed at this executable head: native runtime `38064859106`, online Worker/browser `38064859184`, frontend `38064859098`, Cloudflare target `38064859158`, backup/setup `38064859128`, historical Docker regression `38064859148`. Historical container tests do not imply home-lab deployment. Automated review completed on the initial production-fix commit without discussion findings; subsequent executable changes only aligned the test harness with the pinned schema.

Initial runtime workflow attempts failed at test-harness constructor validation before any auth execution. Those are not represented as passing authentication tests. No tests were removed or softened. The final corrected harness passes all original 20 checks.

Preparation container had no GitHub/npm DNS access, so only isolated source syntax/YAML checks were run there; full runtime/browser tests above ran on GitHub. Source was matched to original auth blob `4588079200b464d148d328d36e2bee47f3993e7a`. No user checkout, real credentials, cookies or data were modified or copied into tests.

## Next action and limits

After merge, request a NEW main run of `deploy-online.yml` using the already stored production secrets. Do not retry the older deployed SHA, recreate tokens or rerun account/email setup. This correction has not yet been deployed and synthetic tests are not a completed live officer login. Verify that the real email-code session now opens the Invictus workspace after deployment.

No TracingBoard organisation branding, Google identity provider, Access policy, officer map, DNS, schema or private member data changed in this patch. The shared login-page branding/Invictus-specific login-method selection is separate from this runtime error. Never change unrelated project settings as a workaround.

Private-register initialisation, live save/reopen/second-officer checks, encrypted cloud export activation, local backup receipt and real restore rehearsal remain outstanding. Do not claim the register populated or backups scheduled. Real source records stay outside public Git history.
