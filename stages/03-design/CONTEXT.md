# 03-design — first private-register handover

The intake is explicitly approved. The current candidate design is `LOCAL-REGISTER-HANDOVER.md`; read it with the approved intake and PROJECT_STATUS.md.

The proposed solution reuses the existing local HTML/CSS/JavaScript frontend from PR #3 and the schema in docs/REGISTER-DATA-MODEL.md. The earlier REGISTER-DESIGN.md remains the baseline architecture record. No backend, framework migration, database service, custom domain, AI memory engine or hosted release is proposed.

The practical gap is an initial reviewed private register, separate from the public code, and a short verified handover. The design specifies how to prepare it without promoting unverified claims or putting member information into GitHub.

Design preparation is authorised; design acceptance and execution of private conversion/local packaging remain pending. Do not interpret the approved intake, this document or successful code checks as approval of the data or authority to update official systems.

## Risks and rollback

Protect against stale source decisions, unknown-to-zero conversion, false completion, competing edited files and public disclosure. Keep original private sources and prior register snapshots. A failing acceptance test blocks handover; propose a bounded fix rather than silently changing app code or schema. No live KOL, bank or account change is part of this stage.
