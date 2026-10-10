# Project status — deployed, sign-in runtime correction under test

Checkpoint: 10 October 2026. Cloudflare-only production at invictus.layer-8-labs.com; GitHub owns source/deployment, local replication is backup-only. No home-lab app, listener, SSH or Tunnel. Continue the already approved bugfix/deployment work; no product approval is reopened.

## Live baseline

Main `0d7bc9518c7b3c358828af60ab9de8aeea7e186f` contains PR #10. Successful deployment run `38058646398` / job `114232196909` applied the D1 schema and uploaded the Worker and its code-only assets. It verified the Custom Domain and anonymous denial, but not a completed officer login. The user subsequently reached the correct Invictus Access application, used email-code sign-in, then received `Sign-in verification is temporarily unavailable.` from the Worker. No token value or authenticated cookie was supplied for this investigation.

The source returns that exact 503 from the public-key retrieval block. It calls `fetch(..., {redirect:'error', signal:AbortSignal.timeout(5000)})`. The unsupported redirect option is a reproducible Workers-runtime compatibility candidate; prior Node tests mocked the global fetch and the bundle dry-run did not execute this authenticated path. The actual real-runtime regression must pass before calling the correction verified.

## Minimal correction

Isolated branch `fix/workerd-access-key-fetch`, based on the verified main above. Change only the JWKS fetch redirect mode to `manual`; retain non-2xx rejection, fixed trusted issuer URL, timeout, key-id matching, cryptographic signature checks, issuer/audience/time validation and officer role enforcement. A redirected key response is rejected, never followed. No Access provider/organisation branding, Google configuration, role map, DNS, schema, data or secret change is included.

Add a real workerd regression workflow using the same pinned Wrangler version as deployment. Test the actual auth module with native workerd Request/fetch/Web Crypto; intercept only the remote transport to return synthetic public keys. The test must reproduce the original generic 503 before transport and verify the corrected signed-login path. Redirect rejection, roles, cache signature checks, tampering, unknown keys, wrong issuer/audience, expiry and missing credentials are also tested. No real cloud identity or sign-in request is used in fixtures.

## Verification boundary

Original auth source was reconstructed and matched Git blob `4588079200b464d148d328d36e2bee47f3993e7a`. Preparation runtime passed JavaScript syntax checks and workflow YAML parsing. Git clone and npm registry access both failed DNS in that runtime; no local workerd execution or full repository test run is claimed. GitHub CI must be inspected at the current patch head for the actual workerd test results and existing regressions.

After tests/review/merge, a fresh main deployment is needed using the existing secrets. No credential re-entry or project/account configuration change is required by this source fix. The real officer login after redeployment remains the acceptance test; synthetic runtime tests are not a completed live login.

Private-register initialisation, live read/save/reopen/second-officer checks and activation of encrypted backup export/local receipt remain outstanding. Do not call the register populated or backups running. Do not load source records into public Git history. Independent application login-method selection remains a separate improvement; do not alter TracingBoard's shared branding or identity provider to fix this runtime bug.
