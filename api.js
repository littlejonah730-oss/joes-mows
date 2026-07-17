// api.js — thin wrapper around fetch for the Joe's Mows LLC API
const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // Clients
  getClients: (search) => request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (body) => request("/clients", { method: "POST", body: JSON.stringify(body) }),
  updateClient: (id, body) => request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: "DELETE" }),

  // Jobs
  getJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/jobs${qs ? `?${qs}` : ""}`);
  },
  createJob: (body) => request("/jobs", { method: "POST", body: JSON.stringify(body) }),
  updateJob: (id, body) => request(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),

  // Notes
  getNotes: () => request("/notes"),
  createNote: (content) => request("/notes", { method: "POST", body: JSON.stringify({ content }) }),
  updateNote: (id, body) => request(`/notes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: "DELETE" }),

  // Summary / growth / settings
  getPaySummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/pay-summary${qs ? `?${qs}` : ""}`);
  },
  getGrowth: () => request("/growth"),
  getSettings: () => request("/settings"),
  updateSettings: (body) => request("/settings", { method: "PUT", body: JSON.stringify(body) }),
};
