# One-time Cloudflare authorisation

The app and live data run only on Cloudflare. GitHub runs the deployment. This setup is administration, not a local installation, backup replication or connection to the home lab.

## Before running

The existing gh login needs administrator permission to blackTieV2/Lodge-KT-Invictus. Cloudflare Zero Trust must already be enabled for the account owning layer-8-labs.com. Keep the existing account; no new domain, plan, payment method or home-lab connection is needed by this script.

Create a dedicated Cloudflare API token through the signed-in Cloudflare account. Do NOT use a Global API key, account password or copied Wrangler credential file. Scope it only to the account owning layer-8-labs.com and only that zone.

The provisioning operations require:

| Scope | Required access |
| --- | --- |
| Workers product | Admin for first creation of the dedicated Worker. Current granular roles distinguish Admin from Editor; per-Worker scope cannot create an absent Worker and currently does not support Custom Domains. Tighten after provisioning where the provider supports it. |
| D1 | Create and manage the dedicated database/migrations (D1 Edit/Write). |
| Access applications/policies | Read and edit this app's sign-in application and named officer policy. |
| Access organisation | Read the account's Zero Trust organisation/auth domain. In the token selector this may be grouped with organisations, identity providers and groups. No identity provider is changed. |
| Zone | Zone Read and DNS Read for active-zone/hostname conflict checks. |
| Zone routes | Workers Routes Edit/Write for attaching the custom hostname. No other zone is in scope. |

Workers role names are evolving: use the actual current token controls. Do not replace a missing permission with a Global API key or unrestricted all-account token. API reads in the setup script test access, but do not prove all write permissions. The hosted deployment verifies those operations. In particular, the old generic Edit Cloudflare Workers template does not necessarily include D1 or Access permissions.

Official references (checked 10 October 2026):
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/authorization/
- https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- https://cli.github.com/manual/gh_secret_set

## Run from the administrative checkout

```powershell
.\scripts\Configure-Cloudflare.ps1 -Deploy
```

The script prompts for the API token invisibly, validates the accessible active domain/account and the required API read families, and asks for the administrator's application sign-in email. Treasurer and Preceptor addresses are optional; absent addresses are not silently granted access. The Cloudflare account email and the application's sign-in email need not be identical.

After typing CONFIGURE, it creates the GitHub production environment only if absent, preserves existing environment protection settings, and stores three environment secrets: CLOUDFLARE_ACCOUNT_ID, OFFICER_ROLES and CLOUDFLARE_API_TOKEN. Secret values are passed on standard input, not in process arguments, a local .env file or chat. Managed in-memory strings cannot be guaranteed zeroised; no secret file is intentionally written. It then requests the hosted deployment if -Deploy was supplied. No data files are uploaded.

A failed partial secret upload leaves the already stored secrets in GitHub; rerun with the intended values to finish. The script never starts deployment after a secret-upload failure. A workflow dispatch is a request, not a successful deployment. Use the run status, then real application sign-in, denied-account and saved-record checks. Production environment approvals, when configured, remain in force.

Do not rerun the earlier Docker-host/SSH prompt or start a local web server. The site is independent of the administrative PC after setup.
