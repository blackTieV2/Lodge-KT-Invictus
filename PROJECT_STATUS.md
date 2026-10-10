# Project status — tested cloud setup and backup tooling, live authorisation still required

Checkpoint: 10 October 2026. Cloudflare-only PR #8 is merged at `5d473150a47608077561e3abc26f7403db68f3d0`. The owner instructed continuation; no product approval is outstanding. Runtime is Cloudflare Workers/D1/Access at invictus.layer-8-labs.com, with GitHub code/deployment. Local replication is backup-only. No home-lab app, listener, Tunnel, port forwarding, SSH target or routine officer file handover.

## Starting live state

Main matched merged PR #8 and the repository remained public at recon. No manually dispatched workflow runs were recorded. No production deployment is claimed. Remote browser profile had no saved Cloudflare login and connector discovery returned no Cloudflare integration. GitHub secret presence/values are not inspectable through the available connector; do not infer that the user has or has not independently configured secrets. No deployment credentials have been made available to this session. PC Wrangler OAuth does not grant them to the chat or hosted Actions.

Read AGENTS.md, current context and deployment/backup contracts. Work is isolated on feature/cloud-setup-backup-tools / PR #9, based on main above. A local clone failed DNS before checkout. New scripts were prepared/tested in a separate container directory; no user working tree was changed. No actual private register, source documents or credentials were retrieved or published.

## Implemented

- scripts/Configure-Cloudflare.ps1: one-time administrative helper with hidden token entry, read-only zone/account/API preflight, explicit officer sign-in addresses, production environment secrets via stdin, preservation of existing environment protection, optional GitHub-hosted deployment request. No local credential file/app.
- scripts/cloud_backup.py plus backup-cloudflare.yml: continuously polled D1 SQL export, fetched Git-history bundle, compressed standard age encryption, ciphertext/receipt-only artifacts. Main/private-repo/live-privacy/enable-flag guards and separate backup credentials. Decryption identity stays outside both cloud services.
- scripts/pull_backups.py: outbound GitHub-only collector with exact workflow/run/commit/contents/size/checksum checks, lock, atomic generation storage, retention of prior copies and stale-copy failure. No Cloudflare credential, inbound access, deletion propagation or upstream writes.
- Unit, actual cryptographic/SQLite/Git recovery, parser and mocked authorisation-flow tests; setup and backup operating docs.

UI, Worker/API and membership schema are unchanged. No DNS, Access policy, database, official KOL/account, plan or billing changes were made by this increment. No real credentials were stored by the assistant.

## Observed verification

Implementation head `474b865e3d2f3905ef4cf4be57543931ed318b78`, expanded test head `bf11ebcbf26ce029a2ad0cc4dcb8d0f79eaf148b`.

13 backup unit tests passed in the preparation container. That runtime lacked age and PowerShell, so no local real-encryption/PowerShell claim is made. GitHub tooling run `38043302653`, job `114187706997`, succeeded at expanded test head: all backup unit tests; real age encrypt/decrypt, wrong-key/tamper rejection, isolated SQLite integrity/audit/snapshot recovery and Git bundle recovery; PowerShell parser; six mocked authorisation scenarios covering successful existing/new environment, cancellation, duplicate email, missing Zero Trust and failed secret upload. Mock CLI assertions verify secret stdin rather than command arguments and no dispatch after failure. All identities/data/keys are synthetic.

Existing online Worker build and real browser workflow also succeeded at initial implementation head (run `38043034898`); latest-head results must be read separately. Current documentation-only updates do not alter tested executable code. Automated review status is on PR #9; do not describe it as a production audit.

## Operational limits

No live provider deployment, actual D1 export, production login/save/reopen, local receipt or real-data restore has been performed by this session. Backup workflow is not activated until INVICTUS_BACKUPS_ENABLED=true and privacy/secret checks pass. No local scheduler, storage destination or recovery key has been configured. Artifacts are temporary cloud staging, not immutable disaster storage. Source bundle reflects the fetched workflow checkout, not an independently verified deployed Worker version; GitHub settings/secrets/issues, LFS/submodule payloads and uncommitted private evidence require separate recovery arrangements.

## Next action

Authorise only this GitHub production workflow using a scoped Cloudflare deployment API token and the selected application sign-in emails. Use Configure-Cloudflare.ps1, not chat-pasted secrets or a copied Wrangler credential file. Then verify protected live deployment and authorised/denied-user/data persistence checks, load the reviewed register privately, and activate/test backup export plus the chosen outbound local collector. Do not restart intake or request home-lab hosting details.
