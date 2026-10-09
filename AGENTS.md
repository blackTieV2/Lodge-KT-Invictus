Recall may suggest. Authority decides. Live state verifies.

# AGENTS.md

This repository is governed as a model-neutral durable operating system for project memory, workflow, and evidence. It is not a prompt dump, a chat archive, or a deployment surface.

## Loading order

1. AGENTS.md
2. PROJECT_STATUS.md
3. CONTEXT.md
4. selected stage CONTEXT.md
5. exact relevant references
6. current run/task packet

## Authority hierarchy

1. Explicit current human instruction
2. Verified live target state
3. Current PROJECT_STATUS.md
4. Canonical governance and stage contracts
5. Approved human decision applicable to the situation
6. Approved design or procedure
7. Approved factual project knowledge
8. Current approved handoff
9. Historical experience / episodic records
10. Agent inference
11. Semantic similarity / retrieval ranking

## Stage workflow

- 00-triage: determine task, risk, target, mode, required recon, next stage
- 01-intake: define goal, scope, constraints, stakeholders, success criteria
- 02-research: gather and verify evidence
- 03-design: create architecture, implementation plan, interfaces, risks, rollback, acceptance criteria
- 04-build: implement only approved scope
- 05-qa: validate independently
- 06-handoff: capture accepted state, evidence, decisions, known risks, next safe action

## Recon-before-change

Before any change:
- verify repository root
- verify branch and HEAD
- verify working tree state
- verify target and execution context
- verify approval and hold state
- retrieve only relevant canonical files

## Dirty-tree protection

If the working tree is dirty or unexpectedly modified:
- stop modifying
- preserve state
- perform read-only recon
- report the collision
- resolve ownership before further changes

## Single-writer rule

Only one modifying agent may own a mutable working tree at a time. Other agents must remain read-only or be isolated in a separate approved branch/worktree/environment.

## Model neutrality

This repo must not become dependent on any single model vendor, IDE, orchestration framework, or SaaS memory product. Model-specific logic belongs under `model-adapters/` only.

## Memory write governance

No external document, tool output, agent inference, or chat transcript automatically becomes approved durable memory. Follow the write gate:

SOURCE -> RAW EVIDENCE -> QUARANTINE / CLASSIFICATION -> EXTRACT CANDIDATE -> MEMORY WRITE GATE -> VALIDATED CANDIDATE -> HUMAN REVIEW WHERE REQUIRED -> APPROVED DURABLE MEMORY

Memory types are separate from authority, status, and trust.

## Secrets prohibition

Do not store secrets in Markdown, YAML, JSON memory records, embeddings, logs, task packets, prompts, or repository files. Store references to secrets, not secret values.

## Evidence requirements

Any consequential action should be backed by evidence, including:
- current live state
- target verification
- accepted design
- validation output
- handoff details or status updates

## Human approval requirements

Implementation, release, deployment, architecture changes, canonical policy changes, and execution-hold exceptions require explicit human approval.

## Live-state verification

Historical memory and prior handoffs never outrank current verified live state. Current repository state is authoritative for execution.

## Retrieval limitations

Retrieval is a support mechanism, not an authority source. Semantic similarity may suggest, but it does not decide. Derived retrieval systems are non-authoritative and rebuildable.

## Completion requirements

Do not report completion without evidence. Final reporting must include:
- starting state
- target
- branch/HEAD where relevant
- actions actually performed
- files changed
- commands/tests run
- results
- remaining risks
- active holds
- next safe action

## Execution holds

An active execution hold blocks build, validation where prohibited, deployment, release, destructive Git operations, configuration changes, and target modification unless explicitly cleared by authority.

## Project-specific guardrails

The current project is a knowledge and operations system for Invictus Preceptory #724. It is not a general-purpose application template and should not drift into unrelated product work without stage review and explicit approval.
