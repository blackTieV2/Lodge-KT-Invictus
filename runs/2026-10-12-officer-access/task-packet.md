# Officer access update — bounded diagnostic and repair

Authority: owner explicitly requested adding the Provincial Registrar, then saved the four-account OFFICER_ROLES secret and dispatched run 38205667121. No real email address or credential belongs in this public task record.

Starting live main: 30588982e9b91f21a75d7f74413fa0e6964cb5e8, tree c711400c3738a051f2da20b29fda920046f2dc85; repository public and no open PRs. Read AGENTS.md, current status/context, Cloudflare-only design, access-policy module and tests. Failed deployment job 114668491681 passed 47 tests and asset build, then stopped in officerPolicyUpdate on unknown policy fields BEFORE policy PUT, D1 or Worker changes. The prior service remains deployed.

Scope: identify the actual policy response shape using a read-only GET diagnostic on an isolated branch and the existing production credentials. Only top-level field names/types are logged; no values, emails, tokens, accounts, app identifiers, private records or artifacts are emitted. Do not replace the policy wholesale or weaken unknown security restrictions. Remove the branch-only diagnostic workflow before merging the repair. Full fixed-policy tests and current CI/review are required before merge; actual deployment is a separate verified operation. No record import, schema migration, unrelated Access project, branding or DNS change.

Local preparation: fresh /mnt/data/invictus-access-fix source directory, no user worktree. GitHub DNS in the preparation runtime failed before any checkout; connected Git API writes use the verified isolated branch. Diagnostic JavaScript syntax check passed. No authenticated production browser access is available here.
