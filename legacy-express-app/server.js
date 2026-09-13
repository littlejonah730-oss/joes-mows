// server.js — Joe's Mows LLC System API
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSetting(key, fallback) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

const asNum = (v, fallback = 0) => (v === undefined || v === null || v === "" ? fallback : Number(v));
const asBool01 = (v) => (v === true || v === 1 || v === "1" || v === "yes" || v === "Yes" ? 1 : 0);

// ---------------------------------------------------------------------------
// CLIENTS
// ---------------------------------------------------------------------------
app.get("/api/clients", (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    rows = db
      .prepare(
        `SELECT * FROM clients WHERE lower(name) LIKE ? OR lower(group_name) LIKE ? OR lower(address) LIKE ? ORDER BY name ASC`
      )
      .all(q, q, q);
  } else {
    rows = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
  }
  res.json(rows);
});

app.get("/api/clients/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Client not found" });
  res.json(row);
});

app.post("/api/clients", (req, res) => {
  const { name, group, address, frequency, day, bagged, phone, avg_time, price } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Client name is required" });

  const stmt = db.prepare(`
    INSERT INTO clients (name, group_name, address, frequency, day, bagged, phone, avg_time, price)
    VALUES (@name, @group_name, @address, @frequency, @day, @bagged, @phone, @avg_time, @price)
  `);
  const info = stmt.run({
    name: name.trim(),
    group_name: group || "",
    address: address || "",
    frequency: frequency || "weekly",
    day: day || "",
    bagged: asBool01(bagged),
    phone: phone || "",
    avg_time: asNum(avg_time),
    price: asNum(price),
  });
  const created = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/clients/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Client not found" });

  const { name, group, address, frequency, day, bagged, phone, avg_time, price } = req.body;
  const updated = {
    name: name !== undefined ? name : existing.name,
    group_name: group !== undefined ? group : existing.group_name,
    address: address !== undefined ? address : existing.address,
    frequency: frequency !== undefined ? frequency : existing.frequency,
    day: day !== undefined ? day : existing.day,
    bagged: bagged !== undefined ? asBool01(bagged) : existing.bagged,
    phone: phone !== undefined ? phone : existing.phone,
    avg_time: avg_time !== undefined ? asNum(avg_time) : existing.avg_time,
    price: price !== undefined ? asNum(price) : existing.price,
    id: req.params.id,
  };

  db.prepare(`
    UPDATE clients SET name=@name, group_name=@group_name, address=@address, frequency=@frequency,
      day=@day, bagged=@bagged, phone=@phone, avg_time=@avg_time, price=@price WHERE id=@id
  `).run(updated);

  res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id));
});

app.delete("/api/clients/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Client not found" });
  db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// JOBS
// ---------------------------------------------------------------------------
const jobWithClientQuery = `
  SELECT jobs.*, clients.name AS client_name, clients.price AS client_price
  FROM jobs
  JOIN clients ON clients.id = jobs.client_id
`;

app.get("/api/jobs", (req, res) => {
  const { from, to, client_id, paid } = req.query;
  let query = jobWithClientQuery + " WHERE 1=1";
  const params = [];

  if (from) {
    query += " AND jobs.date >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND jobs.date <= ?";
    params.push(to);
  }
  if (client_id) {
    query += " AND jobs.client_id = ?";
    params.push(client_id);
  }
  if (paid !== undefined) {
    query += " AND jobs.paid = ?";
    params.push(asBool01(paid));
  }
  query += " ORDER BY jobs.date DESC, jobs.id DESC";

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.get("/api/jobs/:id", (req, res) => {
  const row = db.prepare(jobWithClientQuery + " WHERE jobs.id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found" });
  res.json(row);
});

function weekdayFromDate(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

app.post("/api/jobs", (req, res) => {
  const { date, client_id, description, charge, paid, payment_method } = req.body;
  if (!date) return res.status(400).json({ error: "Job date is required" });
  if (!client_id) return res.status(400).json({ error: "client_id is required" });

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(client_id);
  if (!client) return res.status(400).json({ error: "Client does not exist" });

  // Auto-fill charge from client roster price if not explicitly provided (VLOOKUP-style)
  const finalCharge = charge !== undefined && charge !== null && charge !== "" ? asNum(charge) : client.price;

  const stmt = db.prepare(`
    INSERT INTO jobs (date, weekday, client_id, description, charge, paid, payment_method)
    VALUES (@date, @weekday, @client_id, @description, @charge, @paid, @payment_method)
  `);
  const info = stmt.run({
    date,
    weekday: weekdayFromDate(date),
    client_id,
    description: description || "",
    charge: finalCharge,
    paid: asBool01(paid),
    payment_method: asBool01(paid) ? payment_method || "" : "",
  });

  const created = db.prepare(jobWithClientQuery + " WHERE jobs.id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/jobs/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Job not found" });

  const { date, client_id, description, charge, paid, payment_method } = req.body;
  const newClientId = client_id !== undefined ? client_id : existing.client_id;
  const newDate = date !== undefined ? date : existing.date;
  const newPaid = paid !== undefined ? asBool01(paid) : existing.paid;

  const updated = {
    date: newDate,
    weekday: date !== undefined ? weekdayFromDate(newDate) : existing.weekday,
    client_id: newClientId,
    description: description !== undefined ? description : existing.description,
    charge: charge !== undefined ? asNum(charge) : existing.charge,
    paid: newPaid,
    payment_method: newPaid ? (payment_method !== undefined ? payment_method : existing.payment_method) : "",
    id: req.params.id,
  };

  db.prepare(`
    UPDATE jobs SET date=@date, weekday=@weekday, client_id=@client_id, description=@description,
      charge=@charge, paid=@paid, payment_method=@payment_method WHERE id=@id
  `).run(updated);

  res.json(db.prepare(jobWithClientQuery + " WHERE jobs.id = ?").get(req.params.id));
});

app.delete("/api/jobs/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Job not found" });
  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// NOTES
// ---------------------------------------------------------------------------
app.get("/api/notes", (req, res) => {
  res.json(db.prepare("SELECT * FROM notes ORDER BY completed ASC, created_at DESC").all());
});

app.post("/api/notes", (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Note content is required" });
  const info = db.prepare("INSERT INTO notes (content) VALUES (?)").run(content.trim());
  res.status(201).json(db.prepare("SELECT * FROM notes WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/notes/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Note not found" });
  const { content, completed } = req.body;
  db.prepare("UPDATE notes SET content = ?, completed = ? WHERE id = ?").run(
    content !== undefined ? content : existing.content,
    completed !== undefined ? asBool01(completed) : existing.completed,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id));
});

app.delete("/api/notes/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Note not found" });
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// SETTINGS (worker pay rate, hire milestone)
// ---------------------------------------------------------------------------
app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const obj = {};
  rows.forEach((r) => (obj[r.key] = r.value));
  res.json(obj);
});

app.put("/api/settings", (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    setSetting(k, v);
  }
  const rows = db.prepare("SELECT * FROM settings").all();
  const obj = {};
  rows.forEach((r) => (obj[r.key] = r.value));
  res.json(obj);
});

// ---------------------------------------------------------------------------
// PAY SUMMARY — the core financial engine
// Only PAID jobs count toward revenue / running totals.
// ---------------------------------------------------------------------------
app.get("/api/pay-summary", (req, res) => {
  const { from, to } = req.query;

  let query = jobWithClientQuery + " WHERE jobs.paid = 1";
  const params = [];
  if (from) {
    query += " AND jobs.date >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND jobs.date <= ?";
    params.push(to);
  }
  const paidJobs = db.prepare(query).all(...params);

  const workerRate = asNum(getSetting("worker_rate", "12"));

  const totalRevenue = paidJobs.reduce((sum, j) => sum + j.charge, 0);
  const jobCount = paidJobs.length;
  const workerPay = jobCount * workerRate;
  const myPay = totalRevenue - workerPay;

  const breakdown = { cash: 0, venmo: 0, check: 0, unspecified: 0 };
  for (const j of paidJobs) {
    const method = (j.payment_method || "").toLowerCase();
    if (method === "cash") breakdown.cash += j.charge;
    else if (method === "venmo") breakdown.venmo += j.charge;
    else if (method === "check") breakdown.check += j.charge;
    else breakdown.unspecified += j.charge;
  }

  // Unpaid (outstanding) total, for visibility — excluded from running totals
  let unpaidQuery = jobWithClientQuery + " WHERE jobs.paid = 0";
  const unpaidParams = [];
  if (from) {
    unpaidQuery += " AND jobs.date >= ?";
    unpaidParams.push(from);
  }
  if (to) {
    unpaidQuery += " AND jobs.date <= ?";
    unpaidParams.push(to);
  }
  const unpaidJobs = db.prepare(unpaidQuery).all(...unpaidParams);
  const outstandingTotal = unpaidJobs.reduce((sum, j) => sum + j.charge, 0);

  res.json({
    totalRevenue: round2(totalRevenue),
    jobCount,
    workerRate,
    workerPay: round2(workerPay),
    myPay: round2(myPay),
    breakdown: {
      cash: round2(breakdown.cash),
      venmo: round2(breakdown.venmo),
      check: round2(breakdown.check),
      unspecified: round2(breakdown.unspecified),
    },
    outstandingTotal: round2(outstandingTotal),
    outstandingJobCount: unpaidJobs.length,
  });
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// GROWTH TRACKER
// ---------------------------------------------------------------------------
app.get("/api/growth", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients").all();
  const weekly = clients.filter((c) => c.frequency === "weekly").length;
  const biweekly = clients.filter((c) => c.frequency === "biweekly").length;
  const monthly = clients.filter((c) => c.frequency === "monthly").length;
  const oneTime = clients.filter((c) => c.frequency === "one-time").length;
  const recurringTotal = weekly + biweekly;

  const milestone = asNum(getSetting("hire_milestone", "25"));
  const progressPct = milestone > 0 ? Math.min(100, Math.round((recurringTotal / milestone) * 100)) : 0;

  res.json({
    totalClients: clients.length,
    weekly,
    biweekly,
    monthly,
    oneTime,
    recurringTotal,
    hireMilestone: milestone,
    progressPct,
    milestoneReached: recurringTotal >= milestone,
  });
});

// ---------------------------------------------------------------------------
app.get("/api/health", (req, res) => res.json({ status: "ok", brand: "Joe's Mows LLC" }));

app.listen(PORT, () => {
  console.log(`🟢 Joe's Mows LLC API running on http://localhost:${PORT}`);
});
