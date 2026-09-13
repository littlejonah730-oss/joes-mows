// Maps San Angelo, TX addresses to actual neighborhood / geographic area names

const NEIGHBORHOOD_RULES = [
  // Named developments / subdivisions
  { patterns: [/bentwood/i], name: "Bentwood" },
  { patterns: [/country club/i], name: "Country Club" },
  { patterns: [/paulann/i], name: "Paulann" },
  { patterns: [/bellview/i], name: "Bellview" },
  { patterns: [/red creek/i], name: "Red Creek" },
  { patterns: [/bonham/i], name: "Bonham" },
  { patterns: [/southland/i], name: "Southland" },
  { patterns: [/westridge/i], name: "Westridge" },
  { patterns: [/lake\s*view/i], name: "Lake View" },
  { patterns: [/north\s*ridge/i], name: "North Ridge" },
  { patterns: [/quail valley/i], name: "Quail Valley" },
  { patterns: [/juniper/i], name: "Juniper" },
  { patterns: [/blue creek/i], name: "Blue Creek" },
  { patterns: [/spring creek/i], name: "Spring Creek" },
  { patterns: [/laguna/i], name: "Laguna" },
  { patterns: [/bradford/i], name: "Bradford Park" },
  { patterns: [/rio concho|rio vista/i], name: "Rio Concho" },
  { patterns: [/goliad/i], name: "Goliad" },
  { patterns: [/glenmore/i], name: "Glenmore" },
  { patterns: [/san angelo estates/i], name: "San Angelo Estates" },

  // College Hills (ASU area, north-central)
  { patterns: [/college hills/i], name: "College Hills" },
  { patterns: [/alta vista/i], name: "College Hills" },

  // Santa Rita (southwest near downtown)
  { patterns: [/southwest blvd|s\.?\s*w\.?\s*blvd/i], name: "Santa Rita" },
  { patterns: [/\bharris\s*(ave|st|dr)?/i], name: "Santa Rita" },
  { patterns: [/glenna/i], name: "Santa Rita" },
  { patterns: [/antietam/i], name: "Santa Rita" },
  { patterns: [/\breed\s*st\b/i], name: "Santa Rita" },
  { patterns: [/battle park/i], name: "Santa Rita" },

  // Downtown / Central
  { patterns: [/chadbourne/i], name: "Downtown" },
  { patterns: [/irving/i], name: "Downtown" },
  { patterns: [/beauregard/i], name: "Downtown" },
  { patterns: [/\bconcho\b/i], name: "Downtown" },
  { patterns: [/twohig/i], name: "Downtown" },
  { patterns: [/\babe\s*(st|street)?\b/i], name: "Downtown" },
  { patterns: [/oakes/i], name: "Downtown" },
  { patterns: [/magdalen/i], name: "Downtown" },
  { patterns: [/edmund/i], name: "Downtown" },
  { patterns: [/burket/i], name: "Downtown" },

  // West San Angelo
  { patterns: [/bryant\s*blvd/i], name: "West San Angelo" },
  { patterns: [/sherwood/i], name: "West San Angelo" },
  { patterns: [/w\.?\s*harris/i], name: "West San Angelo" },

  // Knickerbocker corridor (southwest)
  { patterns: [/knickerbocker/i], name: "Knickerbocker (SW)" },

  // Mathis Field / airport area (south)
  { patterns: [/mathis field|airport blvd/i], name: "Mathis Field" },

  // Arden Rd / far south
  { patterns: [/arden\s*rd/i], name: "South San Angelo" },

  // Old Ballinger Hwy / northwest
  { patterns: [/old ballinger/i], name: "Northwest San Angelo" },
];

// Handles numbered streets (N-S grid) — San Angelo uses 1st–~55th
function getNumberedStreetNeighborhood(address) {
  const match = address.match(/\b([ns]?)\.?\s*(\d{1,2})(?:st|nd|rd|th)\s*(?:st|street)?\b/i);
  if (!match) return null;
  const direction = (match[1] || "").toLowerCase();
  const num = parseInt(match[2], 10);

  if (num <= 14) return "Downtown";
  if (num >= 15 && num <= 25) return direction === "s" ? "South Central" : "Central";
  if (num >= 26 && num <= 37) return "College Hills";
  if (num >= 38) return "North San Angelo";
  return null;
}

export function getSanAngeloNeighborhood(address) {
  if (!address) return "Unknown Area";
  const cleaned = address.replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();

  for (const rule of NEIGHBORHOOD_RULES) {
    if (rule.patterns.some((p) => p.test(cleaned))) return rule.name;
  }

  const numberedResult = getNumberedStreetNeighborhood(cleaned);
  if (numberedResult) return numberedResult;

  return "Other San Angelo";
}