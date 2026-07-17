# Joe's Mows LLC System

A full-stack field-management app for a lawn care business: clients, jobs, payments, and notes — with automatic pay calculations and a growth tracker.

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend:** React + Vite, React Router
- **Brand:** black + neon green, mow-stripe background

---

## 1. Project structure

```
joes-mows-system/
├── server/              # Express API + SQLite database
│   ├── db.js            # Schema + default settings
│   ├── server.js        # All routes
│   ├── db/               # SQLite file lives here (auto-created)
│   └── package.json
└── client/              # React (Vite) frontend
    ├── src/
    │   ├── pages/        # Dashboard, Clients, Jobs, Notes
    │   ├── api.js         # fetch wrapper
    │   ├── App.jsx
    │   └── index.css      # brand styling
    ├── vite.config.js     # proxies /api to the backend on :4000
    └── package.json
```

## 2. Requirements

- Node.js 18+ and npm

## 3. Install & run — backend

```bash
cd server
npm install
npm start
```

The API runs at **http://localhost:4000**. On first run it creates `server/db/joesmows.db` automatically with all tables and sensible defaults (worker rate = $12/job, hire milestone = 25 recurring clients).

## 4. Install & run — frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

The app runs at **http://localhost:5173** and proxies all `/api/*` requests to the backend on port 4000, so just start both and open the Vite URL in your browser.

## 5. Using the app

1. **Clients** — add your roster first (name, group, address, frequency, day, bagged clippings, phone, average time, price). This is your "lookup table."
2. **Jobs** — add a job, pick a client, and the charge auto-fills from that client's roster price (edit it if a job is a one-off price). Toggle **Paid** and pick a payment method (Cash / Venmo / Check) once you're paid — only paid jobs count toward totals.
3. **Dashboard** — shows Total Revenue, Worker Pay, My Pay, and the payment-method breakdown, all recalculated live from paid jobs. It also shows your growth tracker toward the "time to hire" milestone.
4. **Notes** — a simple running task list (buy weedkiller, call Dorothy, teach Enrique, etc.) with add/complete/delete.

## 6. Adjusting pay rate & hire milestone

These are stored in the `settings` table and exposed via the API — update them with:

```bash
curl -X PUT http://localhost:4000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"worker_rate": "15", "hire_milestone": "30"}'
```

(A settings screen isn't built into the UI yet — this is the fastest way to change them. Ask if you'd like a Settings page added.)

## 7. API reference

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/clients` | List / create clients (supports `?search=`) |
| PUT/DELETE | `/api/clients/:id` | Update / delete a client |
| GET/POST | `/api/jobs` | List / create jobs (supports `?from&to&client_id&paid`) |
| PUT/DELETE | `/api/jobs/:id` | Update / delete a job |
| GET/POST | `/api/notes` | List / create notes |
| PUT/DELETE | `/api/notes/:id` | Update (toggle complete) / delete a note |
| GET | `/api/pay-summary` | Revenue, worker pay, my pay, payment breakdown (paid jobs only) |
| GET | `/api/growth` | Client counts by frequency + hire-milestone progress |
| GET/PUT | `/api/settings` | Read / update worker rate & hire milestone |

## 8. Notes on the pay math

- **Total Revenue** = sum of `charge` for jobs where `paid = 1`.
- **Worker Pay** = (# of paid jobs) × `worker_rate` (flat rate per job, adjustable in settings).
- **My Pay** = Total Revenue − Worker Pay.
- Unpaid jobs are shown separately as "Outstanding" and never affect the running totals — exactly like the spec requires.

## 9. Production build (optional)

```bash
cd client
npm run build
```

This outputs static files to `client/dist/` which you can serve with any static host, or point Express at it (add `express.static` for `client/dist` in `server.js`) to serve everything from one server.
