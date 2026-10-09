# Invictus · The Register

A small, local-first membership status front end for the Registrar, Treasurer and Preceptor of Invictus No. 724. No custom domain, cloud account, installation or backend is required for the portable page.

## Use it

Open `app/index.html` in a current desktop browser. Or build the single portable HTML file with `node scripts/build.mjs`, then open `dist/Invictus.html`.

Choose **Open file** and select your private Invictus Register JSON or encrypted `.invictus` file. The application starts empty; **Try a fictional demonstration** is safe sample data. Real records are deliberately not in this public repository.

Search by name, alias, MMH or invoice. Select a name for status, account position, sources, notes and follow-ups. **Save private copy** downloads a new encrypted snapshot. Saving a record changes memory; exporting keeps those changes after the session.

## What is included

- Searchable register; current, missing-KOL, payment, departure and red-flag filters.
- Separate membership, evidence-basis, KOL and financial status fields.
- Registrar and Treasurer work queues, completion references and new follow-ups.
- Working-record editing, source snapshot and local change history.
- Proposed GP-cost review, expressly pending approval and separate from member debt.
- Encrypted export/import, optional encrypted browser copy, readable JSON and CSV summary exports.
- Responsive layout, keyboard focus, accessible dialogs and print styling.

## Important boundaries

This is a **local file tool**, not a shared online database. Use one editor at a time and hand over the latest file. No automatic merging or synchronisation is implemented. Everyone who can unlock a copy can edit it; operator names are attribution, not authentication.

KOL, bank records and the Treasurer's books are not changed. Marking a follow-up done records the operator's claim plus a reference; it is not independent verification. Proposed cessation is not implemented automatically. Statutes of Great Priory control the rules; neither imported spreadsheets nor this UI override them.

JSON/CSV are unencrypted. Never commit personal data, evidence documents, bank records, tokens or private exports. An encrypted file also belongs outside this public repo. Keep a separate backup and keep the passphrase safe; there is no recovery service. A browser copy is not a backup.

## Development and checks

Runtime: plain HTML/CSS/JavaScript, no dependencies or external calls. Node 22+ is used only for tests and optional bundling.

```sh
node --test tests/core.test.mjs
node scripts/build.mjs
python -m pip install playwright==1.57.0
python -m playwright install chromium
python tests/browser_smoke.py
```

For the file-URL browser test set `INVICTUS_FILE=1`. Set `CHROMIUM_PATH` only when using an existing Chromium executable. `INVICTUS_IN_MEMORY=1` tests UI rendering in a restricted runner; it intentionally does not claim to test browser encryption/storage.

The existing project governance scaffold remains. Read `stages/01-intake/REGISTER-SCOPE.md`, `stages/03-design/REGISTER-DESIGN.md` and `docs/REGISTER-DATA-MODEL.md` for the bounded implementation. Shared-backend, hosting and LLM automation work remain out of scope.
