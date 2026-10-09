# Intake: lightweight member-status front end

## Current human direction

The user narrowed the earlier platform proposal: no custom Cloudflare domain; a quick front end mainly for the Registrar, Treasurer and possibly Preceptor. The user explicitly requested implementation in this repository ("get to it - make a front end i can use") and then delegated sequencing ("but up to you").

This is the authority for a bounded local-front-end build and its validation. It is not approval to publish member data, deploy a shared service, incur hosting charges or automate official membership decisions. This scope supersedes the bootstrap-only hold **only for this isolated frontend task**. The broader platform remains held.

## Product scope

Find a Brother Knight by name/alias/MMH/invoice; see membership, KOL and financial positions separately; review source qualifications; edit working notes/status with a reason; track Registrar/Treasurer follow-ups and proposed GP costs. Preserve unknowns, proposed outcomes and original source snapshots.

## Responsibilities

Frontend: render/search/filter records; validate imports and edits; maintain a local change history; encrypt/decrypt portable files; export summaries; warn about unsaved work and replacement imports.

Backend: none in v1. File and encryption functions are client-side persistence helpers, not a shared backend. Future authentication, central storage, concurrent editing, backups and external integrations require a new approved intake.

Human officers: establish authoritative facts, approve statutory/financial action where required, update KOL/accounts separately, retain evidence, export the latest file and manage handover.

## Data and memory categories

Controlling rules; original source claims; user-confirmed working decisions; unresolved/proposed findings; current working views; locally recorded change events. These categories remain separate. No AI-generated fact becomes law or authoritative evidence merely by appearing in the UI. Private runtime records and source documents are never repository memory.

## Acceptance

No domain/backend needed. Search and filters work. Empty/demo/import states are distinct. No private records are bundled in public code. Invalid imports leave the current file intact. Unknown balances stay distinct from zero. No automated exclusion, KOL change, payment posting or message sending. Edits have a reason/actor; task completion has a reference. Export/import preserves the working file. The UI works at desktop and mobile widths.

## Explicit limits

One editor at a time. No shared synchronisation, formal accounting ledger, tamper-proof audit, document upload service, statutory rule engine or public membership website. Manual JSON import is supported; native Excel/CSV import is not.
