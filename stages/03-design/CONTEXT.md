# 03-design

This stage creates architecture, implementation plan, interfaces, risks, rollback, and acceptance criteria.

## Design principle
Design does not authorize build. It is a candidate for review, approval, and later validation.

## Candidate architecture
- front-end: lightweight site for preceptory information and operational views
- backend: small database-driven process for records and maintenance workflows
- orchestrator memory: durable knowledge files and event/state records
- governance: stage-based structure and explicit approval gates

## Risks
- scope creep
- premature implementation without clear requirements
- poor separation between memory and runtime state

## Rollback
- keep feature work isolated in approved branches
- preserve evidence and handoff records
- avoid broad architectural commitments before intake and design review
