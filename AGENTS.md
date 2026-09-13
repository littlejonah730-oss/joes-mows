# AGENTS.md

## Project Context

LawnFlow originally shipped as a Base44 app (see `base44/` for the original
entity/workflow/function definitions, kept for reference). It has since been
migrated off the Base44 platform onto **Supabase** (Postgres + Auth + Storage
+ Realtime) — there is no Base44 backend running anymore.

Start with `README.md` for setup: creating the Supabase project, running
`supabase/migrations/0001_init.sql`, configuring auth, and importing
`lawnflow-data-export/` via `scripts/import-to-supabase.mjs`.

## Key Files

- `src/`: frontend application source (unchanged from the Base44 export).
- `src/lib/supabaseClient.js`: the actual `@supabase/supabase-js` client.
- `src/api/entitiesClient.js`: generic CRUD + realtime over Supabase tables,
  keyed by the same entity names Base44 used (see `ENTITY_TABLES`).
- `src/api/authClient.js`: Supabase Auth, shaped to match the old Base44 auth
  API so call sites didn't need to change.
- `src/api/base44Client.js`: composes the two above (plus Storage uploads and
  Edge Function invocation) behind the same `base44.*` shape the rest of the
  app already calls — this is intentional, not a leftover to clean up.
- `supabase/migrations/0001_init.sql`: schema + RLS + triggers + storage
  bucket, generated from `base44/entities/*.jsonc`.
- `vite.config.js`: plain Vite + React config; no Base44 plugin.
- `.env` / `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for
  the frontend; `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never `VITE_`-
  prefixed) for the import script.

## Working Notes

- Use `npm run dev` for local frontend development against the live
  Supabase project configured in `.env`. There is no local backend to run.
- New entities: add a table + RLS policy in a new `supabase/migrations/*.sql`
  file, then add it to `ENTITY_TABLES` in `src/api/entitiesClient.js`.
- Run `npm run lint` and `npm run build` before finishing code changes.
- Base44's serverless functions/workflows (`base44/functions/`,
  `base44/workflows/`) are not ported yet — see the "Known gaps" section of
  `README.md` before assuming a feature like the daily digest, recurring job
  generation, or push notifications is live.
