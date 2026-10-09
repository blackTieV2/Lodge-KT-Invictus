# Register file schema v1

Root: `format: invictus-register`, `schemaVersion: 1`, `id`, `title`, `asOf`, `revision`, `notice`, `members`, `actions`, `history`.

A member record has a stable internal `id`, `name`, `aliases[]`, optional `mmh`, and independent dimensions:

- `memberStatus`: subscribing, country, honorary, resigned, cessation-pending, ceased, deceased, applicant, non-member, review.
- `basis`: source, confirmed (user confirmation), proposed, verified, unresolved.
- `effectiveDate`: supported or proposed status date, qualified by `basis` and `statusNote`; blank means unknown.
- `admissionRoute`, `admissionDate`: admission details, not automatically inferred from office, attendance or payment.
- `kolStatus`: registered, closed, missing, correction, verify, not-applicable; `kolAsOf` dates the external snapshot, not a claimed live read.
- `financeStatus`: settled, posting, chase, promised, reconcile, unknown, not-applicable.
- `balance`: working balance in integer SGD cents, or null for not established. It is not a formal ledger.
- `ledgerBalance`: original imported ledger snapshot, also nullable; preserved separately from later corrections.
- `invoice`, `financeNote`: invoice reference and financial qualifications.
- `gpPence`, `gpBasis`: proposed GP-cost absorption in integer GBP pence and explanation, always pending approval in v1. Not a calculated member debt or additional expense.
- `notes`, `sources[]`, `original`: editable working notes, source locators and read-only imported source text.

Action: `id`, `memberId`, `title`, `owner` (Registrar/Treasurer/Preceptor), `state` (open/progress/waiting/done), `priority` (high/normal), optional `due`, `reference`. Completion requires a reference; external completion is not automatically inferred from it.

History event: `id`, `at` (actual local edit timestamp), `actor`, `memberId`, `summary`, `reference`. The history is carried in the private file, not the repository. It is not cryptographically signed or immutable.

Dates use YYYY-MM-DD; no fuzzy string is silently interpreted as an exact date. Empty is unknown. No fake MMH number is required. Duplicate nonblank MMH numbers, duplicate IDs, missing member references, unknown status values and invalid money/dates are rejected.

Import limit: 5 MB; 2,000 people; 15,000 actions; 20,000 events. The public demonstration is generated from synthetic identities only. Private source files and import transformations belong outside this public repository.

## Memory distinction

Controlling authority is not runtime state. Original sources, user decisions, proposed interpretations, working status and editing events are distinct records. A saved or exported value does not promote a claim to authoritative evidence. No LLM memory service is implemented.
