# Task packet — member-status intake alignment

## Human request and target

Continue the proposed safe sequence: lock the small app scope into 01-intake, define the preceptory model, frontend/backend responsibilities, memory categories and events, then seek intake approval before further design. Target: blackTieV2/Lodge-KT-Invictus only.

## Recon

Read AGENTS.md, PROJECT_STATUS.md, CONTEXT.md, the intake context/scope, existing design, data-model document, README, core validator and CI workflow. Verified main at be1fea1e756a307fd18fa22377044edada0438a2, tree 762469efc5c61fb7e68ee7f6ce0c8f46b3cf402f. PR #3 is merged; there were no open PRs at recon. Repository visibility is public. Existing Register checks run 37908807448 succeeded, including both browser modes.

A container git-clone attempt failed because github.com could not be resolved. Subsequent work uses the authenticated GitHub connector, an isolated branch and a tree based on the pinned main commit. No user checkout was accessed or modified. No claim is made about the user's local working-tree state.

## Bounded changes

Replace the stale large-platform intake context; consolidate the current small-product scope, model and responsibilities into REGISTER-SCOPE.md; align root context/status with pending intake review; retain this task packet. No app code, schema, test, workflow, canonical policy, private data or hosting configuration is changed.

## Review conditions

Open a documentation-only PR; leave main and the existing frontend unchanged. Verify the changed-path list and branch head before reporting. Record actual CI results, not predicted success. Intake approval remains pending and is not self-granted by this documentation.

## Remaining limits and next action

One editor per private file; no live backend, authentication, synchronisation or automatic external actions. Real-data preparation is separate and private. Obtain explicit human intake approval, then assess the already merged frontend against the bounded requirements instead of starting a replacement platform.
