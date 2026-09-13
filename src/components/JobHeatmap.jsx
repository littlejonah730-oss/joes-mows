import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const SAN_ANGELO_CENTER = [31.3739, -100.4407];

function getColorForValue(avgValue) {
  if (avgValue >= 50) return "#22c55e";
  if (avgValue >= 30) return "#f59e0b";
  return "#ef4444";
}

function getRadiusForCount(yardCount) {
  return Math.min(55, Math.max(16, 10 + yardCount * 4));
}

export default function JobHeatmap({ jobs = [] }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("avg");

  // Group jobs by unique address
  const addressGroups = useMemo(() => {
    const map = {};
    jobs.forEach(job => {
      const addr = job.customer_address;
      if (!addr) return;
      if (!map[addr]) {
        map[addr] = { address: addr, jobs: [], totalRevenue: 0, count: 0 };
      }
      map[addr].jobs.push(job);
      map[addr].totalRevenue += job.price || 0;
      map[addr].count++;
    });
    return Object.values(map).map(g => ({
      ...g,
      avgValue: g.count > 0 ? g.totalRevenue / g.count : 0
    }));
  }, [jobs]);

  // Geocode + label neighborhoods (cached in localStorage)
  useEffect(() => {
    async function geocodeAll() {
      if (addressGroups.length === 0) {
        setLoading(false);
        return;
      }

      const cache = JSON.parse(localStorage.getItem("lawnflow_geocode_cache") || "{}");
      // Re-fetch any address missing a neighborhood label
      const uncached = addressGroups.filter(
        g => !cache[g.address] || !cache[g.address].neighborhood
      );

      if (uncached.length > 0) {
        try {
          const addressList = uncached.map((g) => g.address);
          const res = await base44.functions.invoke("geocodeAddresses", { addresses: addressList });
          const locations = res?.data?.locations;

          if (Array.isArray(locations)) {
            locations.forEach(loc => {
              if (loc.lat && loc.lng) {
                cache[loc.address] = {
                  lat: loc.lat,
                  lng: loc.lng,
                  neighborhood: loc.neighborhood || "Unknown Area"
                };
              }
            });
            localStorage.setItem("lawnflow_geocode_cache", JSON.stringify(cache));
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
          setError("Could not load map locations. Please try again later.");
        }
      }

      const geocoded = addressGroups
        .map(g => {
          const coords = cache[g.address];
          if (!coords) return null;
          return {
            ...g,
            lat: coords.lat,
            lng: coords.lng,
            neighborhood: coords.neighborhood || "Unknown Area"
          };
        })
        .filter(Boolean);

      setLocations(geocoded);
      setLoading(false);
    }

    geocodeAll();
  }, [addressGroups]);

  // Cluster by neighborhood name
  const neighborhoods = useMemo(() => {
    const groups = {};
    locations.forEach(loc => {
      const name = loc.neighborhood;
      if (!groups[name]) {
        groups[name] = {
          name,
          addresses: [],
          totalRevenue: 0,
          count: 0,
          addressCount: 0,
          lats: [],
          lngs: []
        };
      }
      groups[name].addresses.push(loc.address);
      groups[name].totalRevenue += loc.totalRevenue;
      groups[name].count += loc.count;
      groups[name].addressCount += 1;
      groups[name].lats.push(loc.lat);
      groups[name].lngs.push(loc.lng);
    });
    return Object.values(groups).map(g => {
      const avgLat = g.lats.reduce((a, b) => a + b, 0) / g.lats.length;
      const avgLng = g.lngs.reduce((a, b) => a + b, 0) / g.lngs.length;
      return {
        ...g,
        avgPrice: g.count > 0 ? g.totalRevenue / g.count : 0,
        centerLat: avgLat,
        centerLng: avgLng
      };
    });
  }, [locations]);

  const sortedNeighborhoods = useMemo(() => {
    const arr = [...neighborhoods];
    if (sortBy === "avg") arr.sort((a, b) => b.avgPrice - a.avgPrice);
    else if (sortBy === "revenue") arr.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (sortBy === "jobs") arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [neighborhoods, sortBy]);

  const highCount = neighborhoods.filter(n => n.avgPrice >= 50).length;
  const lowCount = neighborhoods.filter(n => n.avgPrice < 30).length;
  const totalJobs = neighborhoods.reduce((s, n) => s + n.count, 0);
  const totalRevenue = neighborhoods.reduce((s, n) => s + n.totalRevenue, 0);
  const overallAvg = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Mapping neighborhoods...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No job locations to display yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Neighborhood Price Heatmap
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="w-3 h-3" /> {highCount} high</span>
          <span className="flex items-center gap-1 text-red-400"><TrendingDown className="w-3 h-3" /> {lowCount} low</span>
          <span className="text-muted-foreground">{neighborhoods.length} neighborhoods</span>
          <span className="text-muted-foreground">Avg <span className="text-primary font-semibold">${overallAvg.toFixed(0)}/job</span></span>
        </div>
      </div>

      {/* Map with neighborhood circles */}
      <div className="h-[320px] w-full rounded-xl overflow-hidden border border-border mb-4">
        <MapContainer
          center={SAN_ANGELO_CENTER}
          zoom={12}
          scrollWheelZoom={false}
          className="h-full w-full"
          style={{ background: "#0a0a0a" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {/* Individual house dots */}
          {locations.map((loc, i) => {
            const color = getColorForValue(loc.avgValue);
            return (
              <CircleMarker
                key={`house-${i}`}
                center={[loc.lat, loc.lng]}
                radius={3}
                pathOptions={{
                  color: "#fff",
                  fillColor: color,
                  fillOpacity: 1,
                  weight: 1
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold mb-1">{loc.address}</p>
                    <p>Jobs: {loc.count}</p>
                    <p>Revenue: ${loc.totalRevenue.toFixed(0)}</p>
                    <p>Avg $/Job: ${loc.avgValue.toFixed(0)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          {/* Neighborhood circles (on top) */}
          {neighborhoods.map((nb, i) => {
            const color = getColorForValue(nb.avgPrice);
            return (
              <CircleMarker
                key={i}
                center={[nb.centerLat, nb.centerLng]}
                radius={getRadiusForCount(nb.addressCount)}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.25,
                  weight: 2
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent>
                  <div style={{ textAlign: "center", fontSize: "10px", lineHeight: "13px" }}>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{nb.name}</div>
                    <div style={{ color: "#ccc" }}>${nb.avgPrice.toFixed(0)}/job · {nb.addressCount} yards</div>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold mb-1">{nb.name}</p>
                    <p>Jobs: {nb.count}</p>
                    <p>Yards: {nb.addressCount}</p>
                    <p>Total Revenue: ${nb.totalRevenue.toFixed(0)}</p>
                    <p>Avg $/Job: ${nb.avgPrice.toFixed(0)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">High ($50+/job)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Mid ($30–50/job)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Low (&lt;$30/job)</span>
        </span>
        <span className="text-muted-foreground ml-auto">Tap a circle for details</span>
      </div>

      {/* Neighborhood breakdown */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Neighborhood breakdown</span>
          <div className="flex items-center gap-1 ml-auto">
            {[
              { key: "avg", label: "Avg $/Job" },
              { key: "revenue", label: "Revenue" },
              { key: "jobs", label: "Jobs" }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors select-none ${
                  sortBy === opt.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
          {sortedNeighborhoods.map((nb, i) => {
            const color = getColorForValue(nb.avgPrice);
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{nb.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{nb.addressCount} yards · {nb.count} jobs</p>
                </div>
                <span className="text-[11px] font-semibold text-primary shrink-0">${nb.avgPrice.toFixed(0)}/job</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}