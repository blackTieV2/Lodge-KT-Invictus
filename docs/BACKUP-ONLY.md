# Backup-only local replication

Production remains entirely Cloudflare + GitHub. Nothing in the home lab serves this application. Local activity below is ONLY backup collection/verification.

**Tooling implemented; production backup jobs and local replication are not yet enabled or verified.** Synthetic tests are not evidence of a real backup.

## Cloud backup

backup-cloudflare.yml runs on GitHub-hosted infrastructure only. It is gated by main, this exact repository, private visibility, and INVICTUS_BACKUPS_ENABLED=true. It is therefore inactive until configured. The nightly schedule is 19:23 UTC (03:23 Singapore), plus manual dispatch. GitHub scheduled delivery may be delayed; this is not a guaranteed backup SLA.

cloud_backup.py rechecks repository privacy using GitHub's live API. It discovers exactly one existing Invictus D1 database, continuously polls a full SQL export, downloads it without forwarding the API token to the signed download URL, and bundles it with full fetched Git history. The SQL includes the data, server audit and recovery snapshot tables. Manifest and plaintext exist only in a temporary private runner directory during processing. An interruption/timeout may leave ephemeral plaintext on that disposable runner until destruction; it is never an artifact path.

The archive is compressed then encrypted using the standard age program and an X25519 public recipient. The private decryption identity is NOT stored in GitHub, Cloudflare, this repository or the backup collector. Keep it in an independent secure recovery location and confirm recoverability.

Only backup.tar.age and its nonsensitive checksum/identity receipt are uploaded as GitHub artifacts. The artifact name identifies run and attempt. Requested cloud retention is 90 days, subject to repository/plan policy and Actions/storage allowance. No plan upgrade or billing change has been made. GitHub artifacts are an export staging copy, not immutable disaster storage.

The source bundle contains Git refs fetched by full-history checkout. It is not a backup of GitHub issues, PR discussions, secrets, account settings, Git LFS object payloads, submodules or uncommitted source files. Do not claim complete private-evidence coverage: minutes/summons not committed to the verified private repo need a separate protected archive. A normal Git clone alone is not a D1 backup.

D1 export can briefly prevent live queries; the nightly window is deliberate. Deployment and export share the same workflow concurrency group and do not overlap with each other. The online application does not depend on the backup job succeeding.

## Outbound-only local collector

python scripts/pull_backups.py --destination <private-backup-folder> runs only on the chosen backup device. It requires Python 3.11+ and an authenticated gh CLI with read-only repository/Actions access. It does not require a Cloudflare credential, private decryption key, inbound port, Tunnel, app server, Docker or SSH access from outside the lab.

The collector checks live repository privacy, considers the latest 100 successful main-branch backup runs, downloads each matching nonexpired artifact not already held, validates expected contents/run/commit/checksum and publishes each local generation by same-filesystem rename. Existing generations are never silently overwritten or deleted. It revalidates previously held copies and reports the newest verified cloud generation as stale if older than 36 hours. Failure returns nonzero; no push or upstream change is possible through this script. A local lock prevents overlapping collectors.

last-receipt.json is written only after usable copies were verified. It records check time and latest cloud backup time separately and always states restore_verified: false. This is checksum validation, not cryptographic decryption or a restore test. Configure a local scheduler/monitor to surface nonzero exits and stale receipts; no notification channel or scheduler has been installed. A receiver failure cannot be detected from successful cloud export alone.

The destination must be outside the code checkout. Use a restricted local folder/volume and versioned NAS/offline snapshots as appropriate. The collector deliberately does not implement automatic pruning or upstream-deletion propagation; review retention/capacity separately. Earlier proposed 30 daily/12 monthly retention is not automatically applied. Home-lab downtime does not affect the live website.

## Activation still required

1. Deploy/protect the live Cloudflare site and verify its data before enabling export.
2. Make the repository private and verify it. Store production backup secrets: CLOUDFLARE_BACKUP_TOKEN (a separate least-privilege token sufficient for D1 listing/export only), BACKUP_AGE_RECIPIENT (the public recipient), and the already configured CLOUDFLARE_ACCOUNT_ID. Never reuse the broad deployment token on the local backup host.
3. Set INVICTUS_BACKUPS_ENABLED=true and run the backup workflow once. Check a complete encrypted artifact, not just a green skipped workflow.
4. Choose the private local destination and run/schedule the outbound collector. Verify both the cloud export and local receipt. No backup host address is required by production.
5. Decrypt a retained artifact in an isolated recovery workspace, validate manifest hashes, import SQL into a fresh test database and verify data/audit/recovery tables and source Git bundle. Do not overwrite production to test backups. Record a real restore exercise before sole reliance.

tests/backup_crypto_integration.py performs real age encryption/decryption, wrong-key and tampering rejection, SQLite integrity/audit recovery and Git bundle recovery using ONLY synthetic data. This checks the package format; it does not validate the actual provider export, real credentials, local scheduler or production restoration.

References:
- https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/
- https://age-encryption.org/
- https://cli.github.com/manual/gh_run_download
