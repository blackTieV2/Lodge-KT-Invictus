# Project status

```yaml
project: Lodge-KT-Invictus
repository: blackTieV2/Lodge-KT-Invictus
checkpoint_date: 2026-10-09
current_stage: 01-intake
current_task: "Align the reduced status-app intake with the existing frontend; seek approval before the next design increment."
review_branch: docs/intake-status-app-review
baseline:
  branch: main
  head: be1fea1e756a307fd18fa22377044edada0438a2
  merged_pr: 3
  frontend_exists: true
  file_schema_version: 1
  repository_visibility: public
existing_frontend_verification:
  workflow: Register checks
  run_id: 37908807448
  head: be1fea1e756a307fd18fa22377044edada0438a2
  observed_conclusion: success
  successful_steps:
    - core regression tests
    - portable-page build
    - browser workflow over localhost
    - browser workflow as a local file
  note: "Observed existing CI evidence; not a new local test run or data certification."
intake:
  document: stages/01-intake/REGISTER-SCOPE.md
  revision: "1.1"
  status: awaiting_human_approval
  approved_by: null
  approval_reference: null
execution_hold: true
execution_hold_scope: "Further design/build, schema changes, backend, hosting, deployment, release and private-data publication."
allowed_now:
  - scope and intake documentation
  - read-only repository and CI verification
  - documentation validation and review
  - preservation of the already merged frontend
new_design_approved: false
new_build_approved: false
deployment_approved: false
release_approved: false
private_data_publication_approved: false
known_limits:
  - "One private-file editor at a time; no shared synchronisation."
  - "No login or enforced role permissions; operator names are attribution."
  - "No automatic KOL, official account, membership or correspondence actions."
  - "No real register is bundled; initial reviewed conversion remains separate."
  - "Local history is not tamper-proof; browser storage is not a backup."
next_safe_action: "Obtain explicit approval of REGISTER-SCOPE.md before assessing the next bounded design increment."
```

The prior local-frontend build is preserved. Returning the active work item to intake does not delete the app, undo PR #3 or claim that its earlier approval was absent. It prevents old scope-exception wording from authorising additional work automatically. Generic platform, backend and deployment holds remain in place.
