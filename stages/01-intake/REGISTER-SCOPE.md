# Intake: Invictus member-status app

Status: **DRAFT FOR HUMAN APPROVAL — no further design or build authorised by this document.**

Revision: 1.1 | Prepared: 9 October 2026 | Product owner: repository owner

## 1. The product we intend to deliver

A small, private working register for Invictus Preceptory & Priory No. 724. Its main job is to answer: **What is this Brother Knight's recorded membership position, payment position, KOL position and next outstanding action?**

Primary users are the Registrar and Treasurer, with optional use by the Preceptor. This is one Preceptory and a small number of operators, not a commercial platform, public member directory or general LLM operations product.

The user's reduced scope supersedes the earlier large-platform proposal for this task: no purchased/custom domain, no Cloudflare setup requirement, no hosting charge commitment and no mandatory cloud account. Existing generic governance scaffolding is retained, but does not add features to this intake.

### Existing work — not a new approval

PR #3 is already merged into `main` at `be1fea1e756a307fd18fa22377044edada0438a2`. It contains a local HTML/CSS/JavaScript frontend, a v1 private-file contract and a bounded design. Preserve that work. This intake aligns and completes the product definition; it does not pretend the frontend has yet to be written or retrospectively certify every existing design choice.

The earlier scope treated delegated sequencing as build authority. For the next increment, use the explicit approval gate in section 10. Do not infer new approval from this draft, a successful test, an old handoff or the phrase "continue" alone.

## 2. Smallest useful scope

| Must be easy | Required result |
| --- | --- |
| Find a Brother Knight | Search by name, alias, MMH number or invoice reference. |
| Understand his position | Show membership, evidence basis, KOL snapshot and finances separately. |
| See what needs attention | Filters and Registrar/Treasurer queues; one clear next action, owner and reference. |
| Maintain the working record | Update a note, status or follow-up with an explanation and operator attribution. |
| Avoid stale information | Show the register date, external snapshot date, original account figure and later working correction. |
| Keep the file | Explicit private export/import; warn about unsaved changes and replacement imports. |

The current local-first implementation is the recommended v1 baseline. The app opens in a browser and reads a separately held private register file. Backend responsibilities are defined below even though v1 has no server.

### Explicitly outside this increment

No public membership website, member self-service, shared live database, simultaneous editing, cloud deployment, automated correspondence, bank/KOL writes, full accounting ledger, statutory adjudication engine, AI chat/memory service, vector database or automatic extraction from private documents. No native spreadsheet importer is promised: current import is the v1 JSON or encrypted register file.

Existing source documents stay in their private location. The first usable real register still needs a separately authorised, reviewed conversion from the working sources. Do not expect officers to hand-author JSON as their everyday workflow. Do not bundle that real register into code or this public repository.

## 3. Preceptory data model — practical v1

This is the logical intake model mapped to the existing format, not a new database schema or schema migration. The exact current contract remains `docs/REGISTER-DATA-MODEL.md`; the validator is `app/core.js`.

| Record / fields | Meaning and boundary |
| --- | --- |
| Register: `format`, `schemaVersion`, `id`, `title`, `asOf`, `revision`, `notice` | One private working snapshot. `asOf` is its stated coverage date, not proof of a live read of every source. Revision is local versioning, not multi-user locking. |
| Person: `id`, `name`, `aliases[]`, `mmh` | Stable internal identity; MMH is optional. Names are not keys. Do not invent an MMH number or merge people just because names resemble each other. |
| Membership: `memberStatus`, `basis`, `effectiveDate`, `statusNote` | The recorded local position and its qualification. A proposed date is not a verified effective date. |
| Admission: `admissionRoute`, `admissionDate` | Founder, installation, joining or rejoining details as supported. Attendance, office and payment do not prove admission. |
| External record: `kolStatus`, `kolAsOf` | Last known KOL position and snapshot date. Missing from an export is not proof of non-membership; a correction request is not a completed KOL correction. |
| Account: `financeStatus`, `balance`, `ledgerBalance`, `invoice`, `financeNote` | Working summary and original ledger snapshot. Amounts are integer SGD cents or `null` when not established. No transaction ledger is implemented. |
| GP costs: `gpPence`, `gpBasis` | Proposed absorption in integer GBP pence and its explanation. Pending approval in v1, separate from member debt. Zero means no proposed amount entered, not proof that no historic cost exists. |
| Evidence: `sources[]`, `original`, `notes` | Source locators and preserved imported text, not uploaded documents. `sources[]` contains strings. Read-only in the UI is not tamper-proof storage. |
| Action: `id`, `memberId`, `title`, `owner`, `state`, `priority`, `due`, `reference` | A follow-up linked to one person. Completion requires a reference but remains an operator's recorded claim. |
| History: `id`, `at`, `actor`, `memberId`, `summary`, `reference` | Local editing history carried with the private file. It is not an official minute or an independently signed audit trail. |

Membership values: `subscribing`, `country`, `honorary`, `resigned`, `cessation-pending`, `ceased`, `deceased`, `applicant`, `non-member`, `review`.

Evidence basis values: `source`, `confirmed` (user confirmation), `proposed`, `verified`, `unresolved`.

KOL values: `registered`, `closed`, `missing`, `correction`, `verify`, `not-applicable`.

Financial values: `settled`, `posting`, `chase`, `promised`, `reconcile`, `unknown`, `not-applicable`.

Action values: owner `Registrar` / `Treasurer` / `Preceptor`; state `open` / `progress` / `waiting` / `done`; priority `high` / `normal`.

Dates use `YYYY-MM-DD`; blank means not established. An actual recording timestamp and a historical effective date are different. Money is not a floating-point account balance; unknown is not zero. Current-membership counts are counts of recorded classes, not a certified roll cleared of every statutory question.

The v1 file holds a current membership view, not a complete relational history of membership periods, qualifications, invoices or officer terms. Historic changes and KT/Malta or office particulars may be retained as qualified source notes. Structured business-event tables, multiple account transactions and additional fields need approved design rather than silently changing v1.

## 4. Web app responsibilities

The frontend presents the working record, searches and filters it, makes uncertainty visible, manages local edits and follow-ups, validates the supported import format, preserves original source text and provides private exports.

The frontend must distinguish empty, fictional-demo and private-import states. Opening another file replaces the working dataset; it is not a merge. A failed import must leave the existing dataset intact. Download initiation is not proof that the file was retained.

It must not infer membership from a payment, a visitor entry or an officer listing; turn a payment promise into a receipt; turn a proposed cessation into an implemented event; or equate a local task update with an external system change.

The interface should stay small: register/search, a member detail view, work queues and a proposed GP-cost summary. Usability refinements may reuse the existing frontend after approval. A new framework or platform is not an intake requirement.

## 5. Backend and human responsibilities

| Area | v1 responsibility |
| --- | --- |
| Persistence | Client-side file handling. Edits are in browser memory until explicitly saved/exported. An optional encrypted browser copy is not a backup. |
| Authentication and permissions | No server login or enforced role permissions. Operator names and action owners are attribution/assignment only. Anyone able to unlock a copy can edit it. |
| Multi-user access | One designated editor at a time. Other officers may consult a dated copy, but it will not refresh automatically. Hand over the latest exported file explicitly. |
| Backup and recovery | Operators retain private backups and protect the passphrase. There is no central recovery service. |
| Registrar | Verify membership claims, qualify dates and evidence, maintain status/follow-ups and make official KOL/return changes separately. |
| Treasurer | Verify settlements and balances against the actual books, distinguish promised/received/posted payments and reconcile GP costs separately. |
| Preceptor | Consult the record and deal with the decisions within his actual authority. App access or a checkbox does not create that authority. |
| Repository maintainer | Maintain code and public-safe project documentation. Do not place operational personal data in Git history, issues, PRs, logs or build artifacts. |

A future backend, only through a separately approved increment, would own authentication, shared storage, authorisation, concurrency control, authoritative server timestamps and backup/restore. It would not acquire authority to approve membership simply by becoming the central datastore. No provider is selected or account created by this intake.

## 6. Memory categories

Here, "memory" means understandable records and project decisions, not an LLM memory product. Type, authority and verification state must not be collapsed into one label.

| Category | What belongs here | Where it belongs |
| --- | --- | --- |
| Controlling rules | Statutes, applicable approved by-laws and relevant directions/dispensations. Record version and locator; show conflicts rather than overwriting the higher authority. | Public-safe rule references in project docs; private instruments remain private. |
| Original source claims | What a ledger, minute, form or external snapshot actually says, including its date and limitations. | Private register locators/imported text and the original private source. |
| Human-confirmed working decisions | A person's reported correction or an officer's instruction, with who, when and evidence basis. Not automatically proof of implementation or statutory validity. | Private working record and change history. |
| Proposed/unresolved findings | An interpretation, estimated date, conflict, missing evidence or pending approval. | Qualified private notes/status; follow-up if action is required. |
| Current working view | The displayed membership, KOL and account summary derived from accepted working inputs. | Private register; never a replacement for the controlling rules. |
| Local edit events | Who changed the file, when, why and with what stated reference. | Private `history[]`; not repository memory. |

Public durable project memory contains only product scope, approved technical decisions, synthetic test cases and non-sensitive operational instructions. Private membership claims are not promoted into repository memory. Do not import private chats wholesale, create embeddings or invoke AI services as part of this v1 app.

## 7. Event records and corrections

The implemented history envelope is `{id, at, actor, memberId, summary, reference}`. `at` is the recorded edit timestamp; the person record's `effectiveDate` qualifies the historical status date. Do not invent a historical event timestamp from an edit timestamp.

Local event descriptions should distinguish working-status correction, payment-summary correction, note amendment, action creation and action-state change. There is no implemented `eventType` or structured statutory-event field in v1; do not add undocumented fields and assume they survive validation.

A claim such as "resignation received", "ballot held", "appointed", "invested", "payment received" or "KOL amended" needs its own qualified source reference and relevant date. A local edit only records the claim. A completed task reference does not independently verify it. Proposed and completed acts must not be conflated.

When a working decision is superseded, retain the old source and explain the correction. Do not erase historic founder information as an expedient way to tidy a current list. Imported history can be altered outside the app: this is useful attribution, not a tamper-proof event store.

## 8. Statutory and financial boundaries

The source of rule authority is the supplied Statutes of Great Priory of England and Wales and its Provinces Overseas. Current human instructions can direct a working entry but do not rewrite those rules.

Relevant source locators in the 2025 edition: Statute 97 (PDF page 30, annual-return period and fees for membership during any part); Statutes 107 and 109–112 (PDF pages 33–34, admission and returns); Statute 114 (PDF pages 34–35, resignation); Statute 115(2) (PDF pages 35–36, annual-subscription non-payment and reinstatement); Statute 163 (PDF page 44, confidentiality). Review any later applicable authority before formal certification.

The UI must not use total debt as the two-year annual-subscription test. Founding fees, regalia and annual subscriptions are not interchangeable. A later settlement does not by itself establish uninterrupted membership. A warning note is not proof that a required notice was dispatched.

GP costs remain separate from internal subscription receivables. An invoice issue date is not its fee period, resignation part-way through a GP year does not automatically remove that year's liability, and an expense already recorded must not be charged a second time. V1 displays qualified reviewed amounts; it does not calculate or execute these statutory/accounting outcomes.

## 9. Acceptance and practical limitations

Before accepting use with a real private dataset, demonstrate these scenarios with synthetic records and then review the private conversion separately:

1. A name/alias/MMH/invoice search quickly identifies the right person; similar names stay separate.
2. The member view independently shows membership, evidence basis, account position, external snapshot date and outstanding actions.
3. A settled-but-unposted payment goes to posting follow-up, not an inappropriate collection demand; a promise stays pending.
4. Unknown amounts and dates remain distinguishable from zero and exact dates.
5. A planned admission, proposed cessation, honorary member and visitor can be represented without fabricating a completed act.
6. Invalid or duplicate input fails safely; replacing a file warns about losing unsaved work.
7. Export/reopen retains the working information and local history; wrong-passphrase/tampered-file failures preserve the open record.
8. Completing an action requires a reference and does not automatically change KOL or the official accounts.
9. Desktop and phone-width lookup are readable; browser limitations and any encryption/storage failure are reported honestly.
10. The distributed code/demo contains no real member data; plaintext exports are identified as unencrypted and kept private.

These are acceptance requirements, not a claim that every case was retested during this documentation change. The existing baseline's Register checks run 37908807448 was observed successful, including core tests, portable build and browser workflows over localhost and file URLs. A successful CI run is not approval of membership data or shared/multi-user use.

## 10. Approval and next action

Intake approval: **PENDING**. Approver, date and reference: **not yet recorded**.

Recommended decisions for approval: retain the existing local-file frontend; no backend or custom domain for v1; keep the small working-summary model rather than full accounting; use one-editor-at-a-time file handover; prepare any real-data conversion privately and review it before import.

The material trade-off is file handover. If the officers need live, simultaneous updates, this local-file scope is insufficient and shared storage must be explicitly added before design. No automatic syncing is promised.

Record explicit human intake approval here before starting further design. Intake approval permits the next bounded design review; it is not blanket build, hosting, release or private-data publication permission. Reuse and assess the already merged frontend rather than rebuilding it. Existing code may remain available; no app, workflow, schema, repository-visibility or deployment change is made by this intake alignment.
