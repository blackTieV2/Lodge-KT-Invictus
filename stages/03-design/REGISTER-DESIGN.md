# Bounded design: local file register

Authority: the current human request for a usable frontend and delegated sequencing, recorded in the intake. Design decisions here stay within that scope; unrelated platform/hosting changes are not authorised.

## Structure

`app/core.js`: normalised records, validation, search, summaries, CSV formatting and the encrypted-file codec.

`app/ui.js`: DOM rendering, dialogs, working-record edits, task state, attribution, file import/export and optional encrypted browser copy.

`app/index.html` and `app/styles.css`: accessible interface shell and responsive presentation.

`scripts/build.mjs`: produces one standalone HTML file; hashes inline code/styles for its Content Security Policy. It does not read or embed any member dataset.

## Persistence and sharing

No server. Private JSON is explicitly selected through a file picker and loaded into browser memory. Ordinary edits do not persist by themselves. Export creates a new snapshot with revision and timestamp. Optional localStorage holds only the encrypted export; no passphrase or plaintext dataset is retained there. Browser copies update only on explicit save. Detected cross-tab changes prevent silently overwriting the remembered copy during export.

Encrypted files use Web Crypto AES-256-GCM, a fresh 12-byte IV, 16-byte random salt, PBKDF2-SHA256 with 600,000 iterations, and a fixed versioned authenticated-data label. There is no custom cryptographic primitive. The file codec rejects unsupported parameters before expensive operations. Strong passphrases and independent backups remain necessary.

Opening another file is replacement, not a merge. Existing changes and an older incoming revision are warned about. One officer edits at a time; matching revision numbers alone do not prove that independently edited files are identical.

## Privacy and integrity

No network calls, external fonts, CDN dependencies or analytics. The bundled CSP disallows connections, objects and form submissions. Imported display text is escaped. CSV formula prefixes are neutralised. IDs, statuses, dates, integer money, duplicate identifiers and task references are validated. Closed KOL records are distinct from active registrations. No balance is converted automatically into statutory arrears.

Original source snapshots are read-only in the UI. Local change history is useful attribution, not tamper-proof evidence. Download initiation is not a guarantee that the user retained a file. Browser-storage failures are reported and do not destroy the in-memory register.

## Rules and events

The UI carries rule references and qualifications, not a statutory adjudication engine. Membership status, payment status and external reporting are independent dimensions. An event records local editing time, actor, member ID, changed fields/task and the stated source reference. Historical effective dates remain separate. Imported data does not fabricate completed external actions.

## Rollback

Feature branch is isolated from main; original governance scaffold retained. No official records, repository visibility, deployments, accounts or hosting settings change. Stop using the new page and reopen a retained earlier private-file snapshot. Do not roll back by erasing membership history in KOL.
