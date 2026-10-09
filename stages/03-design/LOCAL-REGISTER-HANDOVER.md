# Design: first usable private register

Revision: 1.0 | Prepared: 9 October 2026

**Design candidate for acceptance. Intake is approved; this work package has not yet been authorised for execution.**

## Decision

Reuse the frontend already merged in PR #3. Keep the v1 data format and existing local-file architecture. No new application code or schema change is planned. The remaining delivery is the first reviewed private data file, validation of the existing page with it, and a short local-use handover. Do not build another platform or require officers to construct JSON manually.

Authority: approved `stages/01-intake/REGISTER-SCOPE.md` revision 1.1, product-owner reply "Yes. Approved", recorded on PR #4 in issue comment 6078163866. That approval permits this design review, not the conversion or delivery itself.

## 1. What the operator will receive

| Item | Contents | Location |
| --- | --- | --- |
| Portable `Invictus.html` | Existing app bundled by scripts/build.mjs; empty on first opening with optional fictional demonstration. No real data embedded. | Local computer; code may stay in GitHub. |
| Initial private register | Existing v1 JSON, with current working summaries, original source qualifications and open follow-ups. Clearly labelled draft/review status where unresolved. | Private delivery and a folder outside the Git checkout. Never GitHub or a public release artifact. |
| Short handover | Open the page, load the file, find a person, edit/save and pass the latest copy to the next editor. | Local instructions; a data-free version can be repository documentation. |
| Conversion/review report | Sources used, identities included, mappings, later corrections, unresolved conflicts and checks. No invented official acts. | Private alongside the register; not a public CI log. |

The first delivered JSON is unencrypted and must be labelled accordingly. The operator uses the existing Save encrypted copy function to choose a strong private passphrase locally and create the .invictus handover file. Do not ask the user to disclose that passphrase in chat or commit it. A subsequent encrypted round-trip with synthetic data is part of acceptance; no password is stored in the app or repository.

This package is not a website deployment or a shared database. No paid account or new hostname is needed.

## 2. Frontend: retain the existing views

The main register already presents Brother Knight, membership/evidence basis, Keystone snapshot, account position and next follow-up. Retain name/alias/MMH/invoice search and the current, missing-KOL, payment, departure and red-flag filters. Use the existing member detail view for notes, source qualifications, edits, follow-ups and local history. Retain the Registrar and Treasurer queues and the separate proposed GP-cost view.

No additional dashboard or navigation redesign is required for this handover. The purpose is to populate and verify what already exists, not change appearance as an excuse for more implementation. Any defect found in acceptance must be documented and proposed as an explicit small fix, not silently included in this documentation work.

## 3. First data-file preparation

Only after approval of this work package:

1. Retrieve the actual available private audit, account/KOL snapshots and later correction records. Inventory names, versions, coverage dates and source locators in the private review report. Treat the present conversation's summaries as context, not a substitute for the sources. No live KOL or bank access is assumed.
2. Match to stable internal person IDs. Prefer established MMH identifiers and evidenced aliases; do not merge on similar names. Preserve former members, applicants and established non-members as distinct record classes when they explain an account or registration discrepancy. Do not convert an attendance list into membership.
3. Map only fields supported by the existing v1 validator. Retain the actual source date in asOf/kolAsOf rather than pretending conversion time is the source date. Use the actual preparation timestamp only for a conversion note in the private report or accurately described local history event.
4. Preserve the original ledger amount in ledgerBalance; place a supported later working correction in balance. Unknown remains null, not zero. An explicit reported settlement with ledger posting still pending is financeStatus posting with a Treasurer action; a promise remains promised. These entries do not post to the actual books.
5. Apply later explicit corrections only to the claims they supersede. Keep prior source text, explanatory notes and references. Use confirmed for a user-confirmed working position rather than automatically upgrading to verified. Keep unresolved dates blank or expressly proposed. A direction to make an external change does not prove it was made.
6. Populate separate Registrar and Treasurer follow-ups. Leave outstanding actions open/waiting as supported; add no fictitious due date, message-sent event, completed registration or payment-posting event. Proposed GP amounts remain qualified and pending, separate from member balances; no fee or cessation engine is added.
7. Validate the candidate, reconcile the private control totals and review every changed or uncertain mapping. If a source is unavailable, state the omission and ask only for that source when necessary; never silently label a partial conversion complete.

Data minimisation: no full addresses, dates of birth, telephone numbers, bank details, signatures or copied private conversations are needed for this status lookup. Include only relevant source excerpts and locators, not whole source rows indiscriminately. Do not add undocumented fields that the v1 normaliser would discard. Exact original documents remain in the operator's private archive.

The conversion may use a one-time private helper outside the repository. It does not add Excel import to the page or create a recurring AI extraction service. No real-data fixtures, private file hashes, member names, balances or screenshots are to be copied into public PRs or CI artifacts.

## 4. Data responsibilities and history

The existing frontend owns local validation, presentation, edits and explicit export. There is no server or API. A full export is the transferable working snapshot; CSV is a summary only, not a restorable backup.

The schema remains `invictus-register`, schemaVersion 1. Preserve members[], actions[] and history[]. Sources remain locator strings, original remains the preserved source excerpt and notes carries qualified context. Local history remains `{id, at, actor, memberId, summary, reference}`. Do not invent structured statutory-event records or add a memory engine.

The operator establishes evidence and makes official account/KOL updates separately. Membership, account, KOL and evidence-basis fields remain independent. The Statutes of Great Priory control the rules; the app does not certify membership. The exact existing field contract is docs/REGISTER-DATA-MODEL.md.

## 5. One-editor handover

The Registrar keeps the designated master snapshot in a private folder outside the code checkout, with a retained earlier backup. Before handing editing to the Treasurer, export, reopen the exported file and check the latest revision and an actual recent change. Then send that file privately; share its passphrase through a separate private channel. The Registrar stops editing that version while the Treasurer holds it. Return the edited export before the Registrar resumes.

A Preceptor consulting a copy treats it as a dated snapshot. There is no enforced read-only role. Conflicting edited copies must be preserved for manual reconciliation; do not choose a winner solely by filename, clock time or revision number. Browser storage is optional convenience, not the master copy or a backup.

## 6. Acceptance before private handover

| Check | Required outcome |
| --- | --- |
| Public/private separation | Portable HTML and public fixtures contain only code/fictional data; no outgoing network request from a loaded private session. |
| Conversion coverage | Every imported source identity is accounted for; exclusions and missing sources are explicitly reported privately. No silently dropped required fields. |
| Lookup | Search finds distinct synthetic and authorised private records by supported identifiers. Member details retain the separate status dimensions and source dates. |
| Account distinctions | Settled-but-unposted is not a collection demand; promised is not paid; null is not zero; GBP proposal totals stay separate from SGD balances. |
| Uncertain records | Proposed cessation, uncompleted admission and unresolved source conflicts are visibly qualified; no automatic statutory outcome. |
| Editing | A note/status/action edit preserves source snapshots and records actor/reason/reference as supported. Marking an action done does not change an external system. |
| Import safety | Duplicate IDs/MMH or invalid data are rejected without replacing the open register. Replacement of unsaved work is warned. |
| Persistence | JSON and encrypted full-file round-trips preserve all supported records and history. Wrong passphrase/tampering fails safely. Test encryption with synthetic data. |
| Handover | Reopening the exported file reproduces the latest record/change and totals; a retained older snapshot can still be reopened. |
| Layout | Desktop and phone-width lookup is readable with no hidden essential status; keyboard/dialog operation works. Local phone file-opening support must be tested separately before promising it. |

Use the existing core tests, portable build and browser smoke tests, including the file-URL route. Their current baseline success is evidence of prior code checks, not acceptance of a not-yet-created private register. Real-data validation runs locally/private only, with no source payloads sent to public CI.

A failed check blocks that deliverable. In particular, do not bypass a browser encryption error with an unlabelled plaintext handover or call a JSON export a protected copy. Source discrepancies do not need to be invented away: they must remain visible and assigned for review.

## 7. Rollback and approval boundary

Retain the starting public commit and all original private sources. Packaging does not change official records; rollback means stop using the candidate and reopen the prior retained private snapshot. Do not remove or rewrite KOL history. No repository-visibility, hosting, account or deployment setting changes are included.

**Next approval requested:** accept this design and authorise one bounded execution package: prepare/review the initial private register from available project sources, run the existing tests and private-file checks, and deliver the existing portable frontend plus separate private data and short instructions. No app-code or schema modification is planned; any necessary fix must be separately identified. Dataset review is not statutory certification. Public release/deployment and publication of member data remain excluded.

Approval state: pending. Once granted, execute that package without reopening the already approved intake.
