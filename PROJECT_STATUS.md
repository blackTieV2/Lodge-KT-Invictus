# Project status — Cloudflare setup and backup tooling

Checkpoint: 10 October 2026. Cloudflare-only decision and PR #8 are merged at `5d473150a47608077561e3abc26f7403db68f3d0`. No product approval is outstanding. The live site is to run only on Cloudflare at invictus.layer-8-labs.com, using the existing Worker, D1 and Access; GitHub hosts code and deployment. Local replication is backup-only. No home-lab listener, Tunnel, port-forward or app hosting.

## Starting state verified

Main matched the merged PR #8. Repository remained public. No manually dispatched workflow runs were recorded at recon; no production deployment is claimed. The available remote browser profile had no saved Cloudflare login, and no Cloudflare connector was available from discovery. The user's PC Wrangler login does not provide this chat or GitHub Actions with the PC credentials.

AGENTS.md and current deployment/backup contracts were read. The new work is isolated on feature/cloud-setup-backup-tools. A local Git clone failed at DNS before checkout. New scripts were prepared in a separate container directory, not the user's working tree. No actual private register, source documents or credentials were read or uploaded.

## Added

- scripts/Configure-Cloudflare.ps1: one-time administrative authorisation helper; hidden token input, active zone/account/API read preflight, private officer-role input, GitHub production environment secret writes over stdin, existing environment protections preserved, optional hosted workflow dispatch. No local app or credential file.
- scripts/cloud_backup.py and backup-cloudflare.yml: full D1 SQL export with continuous bounded polling; source Git bundle; compressed archive encrypted with standard age; ciphertext/receipt only as GitHub artifacts. Requires main, private repo verified live and an explicit enable flag, with separate backup credentials.
- scripts/pull_backups.py: outbound GitHub-only backup pull, run/commit/size/checksum validation, atomic generation storage, retained historical copies, lock and stale-copy failure. No Cloudflare write token, inbound access or upstream data sync.
- Synthetic unit and actual encryption/SQLite/Git restore tests; PowerShell parser check; setup/backup documentation.

No user-interface, Worker/API, membership schema, DNS, Access policy, database or official account/KOL changes are included in this increment. No domain purchase, plan upgrade or live credential configuration has occurred.

## Tests and limitations

13 backup unit tests passed in the preparation container, including bounded polling, unsafe URL refusal, invalid artifact rejection and failure cleanup. The age executable and PowerShell were unavailable in that runtime; the new GitHub tooling workflow therefore runs the real encryption/decryption/isolated restore and PowerShell parsing checks. Check the actual PR/head CI before claiming they passed. All fixtures are synthetic, and unit test encryption substitutes are explicitly labelled.

Even after CI passes, actual Cloudflare permissions/SQL export, production login/data persistence, scheduled artifact creation, local backup receipt and a real-data isolated restore remain unverified. No cloud backup schedule is activated until INVICTUS_BACKUPS_ENABLED=true and privacy/secret requirements pass. No local scheduler/destination/key has been configured. Backup artifacts are staging, not immutable storage; private decryption keys remain separately held.

## Next operational action

Use the scoped Cloudflare API token with the authorisation helper to configure only this repository's production secrets and start the hosted deployment. Never paste the token in chat. After the real cloud site and login/data checks pass, load the reviewed register, verify repository privacy and enable encrypted export plus the chosen local backup collector. Do not ask for Docker-host/SSH details or another intake approval.
