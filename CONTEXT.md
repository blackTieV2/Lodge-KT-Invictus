# Current context: hosted register

Current explicit instruction, 9 October 2026: "I don't want to have to run anything locally! Fix it." The owner will make the repository private after building. This supersedes the prior local-file intake and PR #5 delivery. Do not ask for another approval of this same correction or deliver another local ZIP as the product.

Read AGENTS.md, PROJECT_STATUS.md and stages/03-design/HOSTED-REGISTER.md. The scoped instruction authorises a small hosted application, authentication and shared persistence. It does not authorise publication of real member data while this repository is public, purchase of a domain, changes to other apps or official KOL/account actions.

Implementation: web/ interface, server/ Cloudflare Worker and Access assertion validation, migrations/ D1 state/audit/snapshots, scripts/build-online.mjs, scripts/deploy-online.mjs and hosted GitHub Actions. Preserve existing source distinctions and core v1 validation. No LLM engine or broad platform rebuild.

Account authorisation is a technical prerequisite, not another product approval. A repository made private is not equivalent to a private website. Production data must only be loaded after authentication/authorisation checks, and private source commits only after verified private repository visibility.
