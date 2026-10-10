# Project status — action-first usability correction

The owner has successfully signed in and populated the cloud register, then explicitly rejected the passive spreadsheet-like interface. Current authorised work is to make existing follow-ups directly actionable. Cloudflare Workers/D1/Access and GitHub remain the only production services; local copies remain backup-only. No new product approval is required for this usability correction.

## Starting point and target

Starting main `cd21bfb7ea3be1333da70ba282119b3fe5741f32`, deployed in run `38065242882`. The sign-in runtime fix is in production. The user provided a populated-register screenshot; no direct read or edit of production membership data is performed in this change. Isolated branch: `feature/action-centre`. No open PRs were present at recon; the user checkout is untouched.

## Implemented work

The Action centre becomes the landing page. Follow-up cards expose Start/Resume, Waiting, Complete, Reopen and Edit task controls. The Registrar/Treasurer queues use the same controls. Completed work has its own filter; it is retained rather than deleted. New follow-ups can be created from the action page or a member record. Due dates, priority, owner and progress notes are editable. Status/overdue cards are real filter buttons. Task search includes the action text/reference as well as names and invoice references.

The Members view retains the roll for lookup but adds explicit Open record, Edit and Follow-up buttons. Existing account/membership/KOL editing remains role-controlled. Task completion does not infer or change membership, KOL or balances. Required completion notes, server identity/time, audit/recovery snapshots and conditional versioned saves remain. Stale drafts remain visible on a conflict; failure is not shown as success.

No D1 schema, core file format, loaded register, source documents, sign-in provider/branding, officer-role map, DNS or Cloudflare credentials are changed. No data re-import is required. Source and original ledger fields remain protected.

## Validation and release state

Preparation: 13 action-update unit tests passed, JS syntax and Python test compilation passed. The old member-browser assertions were preserved; its setup now explicitly opens Members after the new action-first landing page. API source outside the narrow action branch/audit label was verified against the original blob. All fixtures are synthetic and independent of the private register.

Full actual-API browser acceptance and existing workflows must pass in GitHub CI before merge. New acceptance covers start/wait/complete/reopen, required reference, task edit/reassignment/creation, filtering, persistent reopen/second-user read, cross-role denial, conflict preservation, failure without false completion, audit/recovery, mobile controls, and unchanged member/evidence data after task operations. A successful synthetic test is not a direct production record check.

The assistant runtime could not clone GitHub because DNS failed; isolated text preparation and connected Git API writes are used. No local server is required of the owner. Deployment remains the existing manually triggered GitHub workflow on main. This checkpoint does not claim the new UI is live. Before release, read the actual CI results and update the PR with the verified commit and evidence.

Next: complete tests/review, merge the correction, then deploy current main with existing credentials. Keep all current production data. Backup activation/independent restore and any separate Access branding request remain separate; do not change another project to fix this interface.
