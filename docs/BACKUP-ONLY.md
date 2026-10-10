# Backup-only local replication

Owner requirement, 10 October 2026: production entirely on Cloudflare and GitHub; local replication ONLY for backups.

**Status: required design, not an installed or verified backup schedule.** No local collector, cloud export schedule, backup credentials, destination or encryption key has been configured by this change. Do not report existing Docker backup code as backing up D1; it does not.

## Required separation

Cloudflare D1 is the only live membership database. GitHub holds application source, schema migrations and deployment configuration. A local Git mirror backs up code, not the D1 database or changes entered through the app. Private minutes/summons/source evidence must also have a protected archive; never assume they are contained in a database export.

The runtime must not read files from a home machine, wait for a backup host, or connect to a home IP. The local collector initiates outbound authenticated downloads only. No inbound listener, SSH hosting dependency, reverse proxy, Tunnel, port forwarding, bidirectional sync or automatic failover. Local edits cannot be pushed into production by the backup process.

## Planned backup flow

1. Produce a consistent full D1 SQL export in the cloud, including data and audit/recovery tables, with the source revision/time and code/migration version recorded in a manifest. Cloudflare's export API can briefly make D1 unavailable; use a quiet period and bounded continuous polling until complete. Never log the signed download URL or dump data.
2. Encrypt the export before placing it in cloud backup storage or downloadable artifacts. Use a supported encryption tool, not an invented cipher. Protect recovery-key custody independently of the repository and verify decryption. Nothing sensitive is committed to Git, including after it becomes private.
3. The local backup collector downloads versioned encrypted exports and the repository mirror using least-privilege read credentials. Prefer read-only access to encrypted backup objects rather than a Cloudflare deployment/write token on the backup host. Record success only after checksum verification and atomic completion.
4. Retain dated snapshots; do not propagate upstream deletion to all local backups. Proposed starting retention: 30 daily and 12 monthly copies, adjustable to storage policy. Use separate immutable/read-only protection where available; a writable mirror alone is not protection against corruption/deletion.
5. Expose last successful export, last successful local receipt and failed/stale backup state without including member information in logs. Proposed starting cadence: nightly; alert when no verified local receipt exists for 36 hours. These settings are not yet scheduled.
6. Rehearse restore into a separate recovery database, verify integrity and key tables/counts, then compare a supported working-record revision. Never test by overwriting production. Keep secrets out of restored source trees.

A cloud export succeeding is not proof that the local copy exists. A checksum is not a restore test. Existing in-D1 revision snapshots/provider recovery are additional layers, not substitutes for this independent copy.

## Setup still required

After the cloud site is live: choose the permitted local backup folder/device, cloud encrypted-export location, encryption/recovery key custody and collector credentials. Implement/test the exporter and pull-only collector, verify first scheduled copies and perform a documented restore. No need to decide a home-lab application server, because there is none.
