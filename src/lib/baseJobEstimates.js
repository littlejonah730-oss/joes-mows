// Manual base job-time estimates (minutes) per customer, used until a real job
// time is recorded and no historical average exists yet.
export const BASE_JOB_MINUTES = {
  "Mr. Compton": 50,
  "Justin Quigley": 40,
  "Vikki's Neighbor": 62,
  "Vikki Naylor": 68,
  "Mimi": 48,
  "Bianca": 50,
};

export function getBaseJobMinutes(name) {
  if (!name) return 0;
  const normalized = name.replace(/[\u2018\u2019]/g, "'");
  return BASE_JOB_MINUTES[normalized] || 0;
}