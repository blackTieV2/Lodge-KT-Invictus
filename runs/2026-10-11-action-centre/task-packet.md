# Action-centre correction

## Authority and scope
The owner says the populated site is unusable as an action list and cannot be checked off. Continue the approved Cloudflare/GitHub application by making task controls visible and usable; preserve the real register. No architecture, identity-provider, external membership/account or private-data publication changes.

## Recon
Repository blackTieV2/Lodge-KT-Invictus, main cd21bfb7ea3be1333da70ba282119b3fe5741f32. Read AGENTS.md, current status/context, Cloudflare-only design, frontend, API and browser-test baseline. No other open PR found. New isolated feature/action-centre branch; no user worktree used. Git clone failed DNS before checkout. The successful live import is evidenced by the user's screenshot, not an assistant-authenticated database query.

## Design and implementation
Default action-card workspace with visible state transitions, completion references, edit/create/reassign/due/priority controls, owner/state/date filters and overdue sorting. Members remains available with obvious Open/Edit controls. Task completion is a recorded assertion, not automatic KOL/account/membership implementation. Existing v1 fields and D1 schema retained. Backend accepts only bounded action fields, enforces current owner permissions and records the stable task ID in audit summaries. Existing write preconditions and SQL triggers are unchanged.

## Tests and rollback
13 focused helper tests passed in preparation; JS syntax/Python compilation passed. Full existing and new browser acceptance runs in CI against synthetic signed users and SQLite. Verify before merge. Source/invoice/account/member objects must remain unchanged across task actions. No dummy or real production entries are created by testing. Rollback code only through a previous Worker deployment, preserving D1; never re-import the original seed to undo UI changes.

## Pending
Inspect CI and code review, merge and deploy through the existing cloud-only workflow. Report merge separately from deployment. No additional token or initial register load should be requested. Capture failures honestly; no automatic background promise or claim of live data certification.
