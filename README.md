# LawnFlow

Field-management app for Joe's Mows: customers, jobs, invoices, expenses,
equipment, employee tracking/portal, and more.

Originally built on Base44; this app now runs on **Supabase** (Postgres +
Auth + Storage + Realtime) instead of the Base44 platform. The Base44 entity
definitions this schema was generated from are kept for reference in
`base44/entities/*.jsonc`; the original data export lives in
`lawnflow-data-export/`.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. In the SQL Editor, run `supabase/migrations/0001_init.sql`. This creates every
   table, row-level-security policy, the `profiles`/auth trigger, realtime
   publication, and the `uploads` storage bucket.
3. Copy `.env.example` to `.env` and fill in your project's values (Project
   Settings → API):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/public key>
   ```

### Auth configuration

- **Email/password + Google** are both used by the Login/Register pages.
  Enable the Google provider under Authentication → Providers if you want
  "Continue with Google" to work.
- Registration expects a 6-digit **email OTP code**, not a magic link: under
  Authentication → Email Templates, set the "Confirm signup" template to
  include `{{ .Token }}` rather than the default confirmation link.
- The **first account to ever sign up becomes admin** automatically (see
  `handle_new_user()` in the migration); everyone after gets the regular
  `user` role. Promote/demote later via the `profiles` table.

## 2. Import the existing business data

The original Base44 data export is in `lawnflow-data-export/*.json`. To load
it into your new Supabase tables:

```bash
npm install
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key, Project Settings → API> \
npm run import-data
```

This uses the **service role key** (not the anon key) to bypass RLS for a
one-time bulk load — never put that key in `.env`/the frontend. It preserves
the original record ids, so cross-references between customers/jobs/invoices/
etc. stay intact.

**Not imported automatically:** Base44 "User" accounts (`User.json`). Each
admin/employee needs to sign up for real through the new Login/Register
pages to get a Supabase auth account; there's no way to recreate a login
without a password. The `Employee` roster itself (name, phone, PIN, pay
stats, etc.) *is* imported — it just isn't linked to a login until that
person signs up and the app matches them by `user_id`.

## 3. Run the app

```bash
npm install
npm run dev
```

## Known gaps from the Base44 → Supabase migration

- **Backend automations** (`base44/functions/*`, `base44/workflows/*`) — daily
  digest emails, recurring job generation, push notifications, the Google
  Sheets expense export, waitlist auto-fill, etc. — were Base44 serverless
  functions and are not yet ported to Supabase Edge Functions. The frontend
  code that calls them (`base44.functions.invoke(...)`) still runs, but those
  specific features will error/no-op until equivalent Edge Functions are
  written under `supabase/functions/`.
- **`base44.users.inviteUser`** (Settings → invite a teammate) needs a
  Supabase Edge Function using the service role (`supabase.auth.admin.inviteUserByEmail`)
  — not included yet.
- **OAuthConsent page** (`src/pages/OAuthConsent.jsx`) implemented Base44's
  MCP-client OAuth consent screen; it has no Supabase equivalent and is
  effectively inert now (it isn't linked from the app's routes).

## Project structure

```
src/
├── api/
│   ├── supabaseClient.js     # (see src/lib/supabaseClient.js)
│   ├── entitiesClient.js     # generic CRUD + realtime over Supabase tables
│   ├── authClient.js         # Supabase Auth, shaped like the old Base44 auth API
│   └── base44Client.js       # composes the above so existing call sites (`base44.*`) didn't need to change
├── lib/
│   ├── supabaseClient.js     # the actual @supabase/supabase-js client
│   └── AuthContext.jsx       # React auth context, now backed by Supabase sessions
└── pages/, components/, hooks/  # unchanged app UI
supabase/
└── migrations/0001_init.sql  # full schema + RLS + triggers + storage bucket
scripts/
└── import-to-supabase.mjs    # one-time data import from lawnflow-data-export/
lawnflow-data-export/         # original Base44 data export (JSON)
legacy-express-app/           # the previous, unrelated Node/Express + SQLite app this repo used to contain
```
