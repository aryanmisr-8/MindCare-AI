# MindCare AI

A guided self-reflection, education, and care-navigation platform for the Indian mental-health
context — built on the accompanying literature review and system blueprint
(`MindCare_AI_Literature_Review_Algorithm_Analysis.docx`, `MindCare-AI-Documentation.pptx`).

**This is a working prototype**, not a certified medical product. Before any real deployment it
needs: a clinical/ethics review, a legal review against the DPDP Act 2023 and any applicable
telemedicine/AI-in-health guidance, a security audit, and a signed license for the BDI-II
instrument if you intend to offer it (see "Licensing note" below).

## What it does

| Feature | Where |
|---|---|
| Sign-up with per-purpose consent, each user gets a private, separate account | `client/pages/signup.html`, `server/src/routes/auth.js` |
| 4 screening tools: PHQ-9, GAD-7, CES-D (fully implemented) + BDI-II (licensed-content slot) | `client/pages/screening.html`, `server/src/instruments.js`, `server/src/routes/screenings.js` |
| Daily journal with a RAG-grounded reflection (retrieval + refuse-if-empty, never open-ended generation) | `client/pages/journal.html`, `server/src/rag/*`, `server/src/routes/journal.js` |
| Research library of depression/anxiety/stress papers, tagged with evidence type & review date | `client/pages/research.html`, `server/src/routes/papers.js` |
| GPS-aware, verification-transparent doctor directory | `client/pages/doctors.html`, `server/src/routes/doctors.js` |
| PostgreSQL-backed medicine & company directory with official price sourcing | `client/pages/medicines.html`, `server/src/routes/medicines.js` |
| Private medical records (metadata only — file bytes belong in object storage) with an explicit share toggle | `client/pages/records.html`, `server/src/routes/records.js` |
| Consent management + explanation of the data-separation model | `client/pages/privacy.html` |
| Crisis pathway (Tele-MANAS 14416 / emergency 112) surfaced from multiple independent signals, never gated behind more AI conversation | `server/src/rag/risk.js`, banner on every page |

## Architecture at a glance

```
client/   static, no-build-step HTML/CSS/JS site (open pages/index.html via a local server)
server/   Node + Express API
  src/instruments.js        item banks for PHQ-9 / GAD-7 / CES-D (BDI-II excluded, see below)
  src/rag/                  retrieval engine (TF-IDF + cosine sim), risk detector, trend detector
  src/routes/               one file per resource; RLS-aware Postgres access via src/db.js
db/
  schema.sql   full Postgres schema: identity vs. sensitive data separation, RLS policies,
               consent + audit tables, doctor/medicine directories (earthdistance for GPS)
  seed.sql     illustrative demo data — replace before real use
```

### Why identity and clinical data are split
`users` holds only login/identity fields. `journal_entries`, `screening_sessions`, and
`clinical_records` all reference `users.user_id` — an opaque UUID — and nothing else identifying.
Row-level security policies (`db/schema.sql`) enforce, at the database level, that a user's app
session can only ever see rows where `user_id` matches their own session context
(`app.current_user_id`), so a bug in application code can't accidentally leak another
person's journal.

### The RAG layer
`server/src/rag/retrieve.js` builds a TF-IDF index over a small, source-tagged corpus
(`server/src/rag/corpus.js`) and returns the top-k passages above a relevance floor for
whatever the person just wrote. If nothing clears that floor, the API returns an explicit
"nothing relevant found" result rather than falling back to unconstrained generation — this
keeps every reflection traceable to a labelled source. Swap `getCorpus()` for a database query
against `research_papers`, and swap the TF-IDF index for a real embeddings/vector-search
call, without touching the calling code in `routes/journal.js`.

### Licensing note — BDI-II
The Beck Depression Inventory-II is commercially licensed by Pearson/Psychological
Corporation. Its items are **not included** in this codebase. `server/src/instruments.js`
defines a `BDI2` entry with `licensing: 'requires_license'`; the API refuses to serve or
score it (`403`) until an operator with a valid license supplies the item bank. PHQ-9,
GAD-7 (Pfizer, free for clinical/educational use), and CES-D (NIMH, public domain) are
included and fully functional.

## Running it locally

**Prerequisites:** Node.js 18+, PostgreSQL 14+ with the `pgcrypto`, `pg_trgm`, `cube`,
`earthdistance`, and `citext` extensions available.

```bash
# 1. Database
createdb mindcare_ai
psql mindcare_ai -f db/schema.sql
psql mindcare_ai -f db/seed.sql

# 2. Server
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, JOURNAL_ENC_KEY
npm install
npm run dev                  # http://localhost:4000

# 3. Client (any static server works)
cd ../client
npx serve .                  # or: python3 -m http.server 5173
# open http://localhost:5173/pages/index.html
```

If your client is served from a different origin than `http://localhost:4000`, set
`window.MINDCARE_API_BASE` before `common.js` loads (e.g. add a small inline `<script>` in
each page), or edit the `API_BASE` constant in `client/assets/js/common.js` directly.

## Before real deployment, still needed

- Real password/secret management (KMS-backed encryption key, not a static env var)
- Object storage integration for actual record file uploads (pre-signed URLs)
- A reviewed, larger research corpus and doctor/medicine dataset with an ongoing
  verification pipeline (the schema already models `verification_state` and
  `last_verified_at` for this)
- Clinical sign-off on screening bands/cutoffs for the Indian population specifically
  (see the literature review's note on cross-population validation)
- A licensed BDI-II item bank, if you want all four instruments live
- Accessibility and regional-language pass (the schema already carries a `locale` field)
- Formal security review (penetration test) before handling real health data in production

# COMPLETELY CHANGED VERSION

A guided self-reflection, education, and care-navigation platform for the Indian mental-health
context: mental-health screening tools, a RAG-grounded journal, a research library, and doctor /
medicine directories, served from a single Node.js + Express API backed by a local SQLite file
(`mindcare.db`).

> **This is a working prototype, not a certified medical product.** Before any real deployment it
> needs: a clinical/ethics review, a legal review against the DPDP Act 2023 and any applicable
> telemedicine/AI-in-health guidance, a full security audit, and a signed license for the BDI‑II
> instrument if you intend to offer it (see "Licensing note" below).

## What changed in this version

This README replaces an earlier draft that described a **PostgreSQL + row-level-security**
architecture (separate `client/` and `server/` folders, `earthdistance` extension, RLS policies,
etc.). The files actually in this repo now — `package.json`, `.env`, `.env.example`, and
`mindcare.db` itself — show the project has moved to a **single-file SQLite backend**:

- `package.json`'s description literally says *"Built-in SQLite edition"*, and its `dependencies`
  contain no PostgreSQL driver (`pg`) and no SQLite driver package (`sqlite3`, `better-sqlite3`,
  etc.) anywhere in `package-lock.json`. That strongly suggests the code uses Node's **built-in
  `node:sqlite` module**, which needs **Node.js 22.5+** — this could not be confirmed directly
  because the `src/` folder was uploaded empty, so check `src/db.js` (or equivalent) yourself and
  update this section if it differs.
- `.env` confirms this: it sets `DATABASE_PATH=./mindcare.db`, not a `DATABASE_URL`.
- There is therefore **no `earthdistance`/PostGIS-based GPS search and no database-level row-level
  security** in this version. Any per-user data isolation and any GPS distance calculation for the
  doctor directory now have to be enforced in the **application code**, not the database — verify
  this in `src/routes/` once you can see it, since it's a meaningful security difference from the
  old design.
- `package.json`'s `main` is `src/index.js` (not `server/src/index.js`), i.e. the backend now
  looks like a flat `src/` at the repo root rather than a nested `server/` folder. No `client/`
  folder was part of this upload, so this README only documents the API server; add a client
  section back in if one exists in your actual repo.

## Tech stack (confirmed from `package.json`)

| Package | Purpose |
|---|---|
| `express` | HTTP server / routing |
| `better-sqlite3`-free — **built-in `node:sqlite`** (inferred, see above) | Database access |
| `jsonwebtoken` | Auth tokens |
| `bcryptjs` | Password hashing |
| `helmet` | Security headers |
| `cors` | CORS handling |
| `express-rate-limit` | Rate limiting |
| `dotenv` | Loads `.env` |

## Features

Based on the tables actually present in `mindcare.db` (introspected via `view_database.py`):

| Feature | Evidence in this repo |
|---|---|
| User accounts with roles, locale, MFA flag, soft-delete (`deleted_at`) | `users` table |
| Per-purpose consent tracking (`journaling`, `screening_tools`, `research_library`, `doctor_directory_gps`, `record_upload`), versioned, with grant/revoke timestamps | `consents` table |
| 4 screening instruments — **PHQ‑9, GAD‑7, CES‑D fully usable (public domain), BDI‑II licensed-content slot** | `screening_instruments`, `screening_sessions` tables |
| Encrypted daily journal entries with mood/anxiety/sleep/energy tracking and a `retention_state` field | `journal_entries` table (`content_encrypted` is a `BLOB`) |
| Research paper library tagged by evidence type, population, and review date, with a plain-language summary | `research_papers` table |
| Doctor directory with specialty, languages, modality, fee, lat/lng, and a `verification_state` / `match_confidence` / `is_sponsored` flag | `doctors`, `doctor_reports` tables |
| Medicine + manufacturer directory with MRP / government ceiling price history | `medicines`, `medicine_prices`, `companies` tables |
| Private clinical records (metadata + `storage_key` only — actual files belong in object storage) with a `sharing_state` toggle | `clinical_records` table |
| Audit log of actions against a user's data | `audit_log` table |

### Why identity and clinical data are separated
`users` holds only login/identity fields. `journal_entries`, `screening_sessions`, and
`clinical_records` all reference a `user_id`, and nothing else identifying. **Note:** the previous
README described this isolation as enforced by PostgreSQL row-level security policies. SQLite has
no equivalent RLS mechanism, so in this version that isolation can only be enforced in the
Express route handlers — this is worth verifying directly in `src/routes/` before relying on it.

### Licensing note — BDI‑II
Confirmed directly from the `screening_instruments` table: `PHQ9`, `GAD7`, and `CESD` are marked
`licensing = 'public_domain'` and are fully scorable. `BDI2` is marked
`licensing = 'requires_license'` (Beck Depression Inventory‑II, commercially licensed by
Pearson/Psychological Corporation) — its items are **not included**, and the API should refuse to
serve or score it until an operator supplies a licensed item bank.

## Repository contents (from this upload)

```
package.json        backend manifest — "mindcare-ai-server", main: src/index.js
package-lock.json    lockfile (npm, lockfileVersion 3) — no pg or sqlite driver present
.env                 local runtime config — see warning below
.env.example         template for .env — currently OUT OF DATE, see "Fix needed" below
mindcare.db          SQLite database file (confirmed schema: 13 tables, see below)
view_database.py     standalone script — dumps every table in mindcare.db to the console
src/                 backend source (uploaded empty in this session — not reviewed here)
node_modules/        installed dependencies (uploaded empty — regenerate with npm install)
```

## Environment variables

Real values are read from `.env` (via `dotenv`). Confirmed keys, from the actual `.env` file:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (`4000`) |
| `DATABASE_PATH` | Path to the SQLite file, e.g. `./mindcare.db` (auto-created on first run) |
| `JWT_SECRET` | Signing secret for auth tokens |
| `JOURNAL_ENC_KEY` | Encryption key for journal entry contents |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |
| `CRISIS_HELPLINE_NAME` / `CRISIS_HELPLINE_NUMBER` | Shown on the crisis banner (default: Tele‑MANAS / 14416) |

### ⚠️ Fix needed: `.env.example` is out of date
`.env.example` still documents a PostgreSQL `DATABASE_URL` (`postgresql://mindcare_app:changeme@...`)
even though the real `.env` uses `DATABASE_PATH`. Update `.env.example` to match, e.g.:

```env
PORT=4000

# SQLite database file (auto-created on first run)
DATABASE_PATH=./mindcare.db

# 32+ byte random secrets — generate with: openssl rand -hex 32
JWT_SECRET=replace_with_a_long_random_value
JOURNAL_ENC_KEY=replace_with_a_32_byte_hex_key

# Comma-separated origins allowed to call this API
CORS_ORIGIN=http://localhost:5173

# Toll-free national mental health helpline shown on every crisis banner (India)
CRISIS_HELPLINE_NAME=Tele-MANAS
CRISIS_HELPLINE_NUMBER=14416
```

### ⚠️ Security: rotate the secrets that were shared
The `.env` file uploaded alongside this project contains **real-looking, non-placeholder** values
for `JWT_SECRET` and `JOURNAL_ENC_KEY`. Treat both as compromised, generate new ones
(`openssl rand -hex 32`), and confirm `.env` is listed in `.gitignore` so it's never committed.

### ⚠️ Privacy: `mindcare.db` contains what looks like a real email address
Dumping `users` with `view_database.py` shows two rows; one uses an obvious test address, but the
other looks like a real personal Gmail address. Don't ship, commit, or share this database file
as-is — reset it to `db/seed.sql`-style fixture data before it goes anywhere near version control
or a shared drive.

## Running it locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# fill in JWT_SECRET and JOURNAL_ENC_KEY (openssl rand -hex 32 for each)

# 3. Run the server
npm run dev      # auto-restart on change (node --watch src/index.js)
# or
npm start        # node src/index.js
# → http://localhost:4000
```

No database creation step is needed — `mindcare.db` is a plain SQLite file at `DATABASE_PATH` and
is created automatically on first run if it doesn't already exist.

### Inspecting the database
`view_database.py` is a standalone diagnostic script (Python 3, standard library `sqlite3` only —
no extra install needed). Run it from the same folder as `mindcare.db`:

```bash
python3 view_database.py
```

It prints every table's schema and full contents to the console. Useful for debugging, but don't
run it against a database containing real user data outside a local/dev environment.

## Database schema (as introspected from `mindcare.db`)

| Table | Row count in this snapshot | Notes |
|---|---|---|
| `users` | 2 | identity/auth only |
| `consents` | 10 | per-purpose, versioned |
| `screening_instruments` | 4 | PHQ9, GAD7, CESD, BDI2 |
| `screening_sessions` | 2 | responses stored as JSON text |
| `journal_entries` | 1 | content stored encrypted (`BLOB`) |
| `research_papers` | 6 | tagged by evidence type / population |
| `doctors` | 23 | includes verification + sponsorship flags |
| `doctor_reports` | 0 | user-submitted issue reports |
| `medicines` | 36 | linked to `companies` |
| `medicine_prices` | 72 | MRP + government ceiling price history |
| `companies` | 11 | manufacturers/marketers |
| `clinical_records` | 1 | metadata + storage key only, no file bytes |
| `audit_log` | 0 | not yet populated in this snapshot |

## Before real deployment, still needed

- Confirm and document the actual `src/` implementation (this session's upload had an empty
  `src/` folder, so route-level behavior — auth, RAG retrieval, risk detection, app-level access
  control — could not be verified against this README; re-check once source files are available).
- Application-level enforcement of per-user data isolation now that there's no database-level RLS.
- Real secret management (KMS-backed encryption key, not a static `.env` value) and rotation of
  the secrets currently checked into `.env`.
- Object storage integration for actual clinical record file uploads (pre-signed URLs) —
  `clinical_records.storage_key` is metadata-only today.
- A reviewed, larger research corpus and doctor/medicine dataset with an ongoing verification
  pipeline (`doctors.verification_state` / `last_verified_at` already model this).
- Clinical sign-off on screening bands/cutoffs for the Indian population specifically.
- A licensed BDI‑II item bank, if you want all four instruments live.
- Accessibility and regional-language pass (`users.locale` already carries this).
- Formal security review (penetration test) before handling real health data in production.
- Scrub `mindcare.db` of the real-looking email address noted above before any sharing or commit.
