# Failure pattern library

## stale-branch-or-dead-base
- symptom: work continues against an outdated base branch
- why dangerous: implementation may target the wrong branch
- required behavior: verify branch and HEAD before change
- prevention: check live target and branch ownership
- validation: review branch state and target gate output

## dirty-tree-collision
- symptom: unexpected file changes appear
- why dangerous: changes may be overwritten or misattributed
- required behavior: stop modifications and preserve working state
- prevention: check git status before every change
- validation: read-only recon and ownership review

## wrong-repository-root
- symptom: actions occur against the wrong repository or subdirectory
- why dangerous: data or changes land in the wrong project
- required behavior: verify root before modification
- prevention: always confirm repository root and target
- validation: compare root and expected repo name

## wrong-target
- symptom: work is done on an incorrect target or branch
- why dangerous: time is lost and the wrong object is modified
- required behavior: verify current live target and approval
- prevention: use a target gate
- validation: confirm target, HEAD, and branch

## execution-hold-violation
- symptom: build or deployment proceeds while a hold is active
- why dangerous: operational policy is bypassed
- required behavior: stop and escalate
- prevention: check active hold state before action
- validation: verify hold status in current project profile

## stale-handoff-conflict
- symptom: old handoff is treated as current truth
- why dangerous: outdated instructions can cause wrong action
- required behavior: current verified state governs
- prevention: refresh with live state
- validation: compare current status with handoff

## multiple-agents-one-working-tree
- symptom: two agents modify same repo without coordination
- why dangerous: concurrent edits cause conflict
- required behavior: enforce single-writer ownership
- prevention: isolate or coordinate work
- validation: check branch ownership and working tree state

## scope-expansion
- symptom: requirements drift beyond the approved scope
- why dangerous: uncontrolled expansion increases risk
- required behavior: stop and request re-approval
- prevention: keep a bounded task packet and explicit scope
- validation: compare change set against approved scope

## false-completion-claim
- symptom: work is reported as complete without evidence
- why dangerous: fake completion blocks correct validation
- required behavior: include evidence and exact command results
- prevention: require completion report with verification notes
- validation: review final evidence and remaining risks

## live-state-not-verified
- symptom: actions proceed based on stale memory or assumptions
- why dangerous: decisions are made against the wrong reality
- required behavior: verify the live state before acting
- prevention: require live verification before implementation
- validation: compare state to current observed repository/host conditions

## memory-poisoning
- symptom: untrusted or contradictory memory is treated as fact
- why dangerous: wrong decisions can be made based on unsupported information
- required behavior: quarantine, classify, and review memory before approval
- prevention: enforce memory write gate and authority separation
- validation: inspect source trust and status metadata

## candidate-promoted-without-review
- symptom: candidate memory becomes canonical without review
- why dangerous: unreviewed judgment may become operational authority
- required behavior: keep candidate memory non-authoritative until review
- prevention: require human review and explicit approval
- validation: confirm memory status and authority fields

## authority-inversion
- symptom: retrieved memory outranks current operational reality
- why dangerous: stale context overrides live state
- required behavior: apply the authority hierarchy and verify live state
- prevention: track authority separately from memory type and trust
- validation: confirm current status and target before action
