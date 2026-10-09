# CONTEXT.md

This repository is a governance and memory scaffold for a project that blends:
- a persistent memory architecture for an LLM orchestrator;
- a small database-backed operational backend;
- a front-end web experience for a preceptory or lodge-facing site;
- a knowledge system for Invictus Preceptory #724.

## Task to stage mapping

- task is vague or uncertain -> 00-triage
- need to define goals and constraints -> 01-intake
- need evidence or external facts -> 02-research
- need architecture or implementation design -> 03-design
- need code or repository change -> 04-build
- need validation or testing -> 05-qa
- need report or handoff -> 06-handoff

## Current phase

This repository is in 00-triage. The immediate objective is governance installation and evidence-preserving project structure, not implementation.

## Current project profile

Project: Lodge-KT-Invictus
Purpose: durable memory + operational knowledge system for an LLM orchestrator supporting preceptory administration and a small web experience.
Audience: project maintainers, future AI agents, and human operators.
Constraints: model neutrality, evidence-based operation, no secrets, current live state governs.

## Important guardrails

- Do not implement application features before intake and design approval.
- Keep the repo model-neutral and portable.
- Distinguish raw evidence from approved memory.
- Keep a controlled, bounded task packet for each run.
- Prefer filesystem-based memory, metadata, and explicit governance over hidden inference.

## Stage boundary

This file routes work to the correct stage. It does not become a giant knowledge dump.
