import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "@/components/CustomerForm";
import ReminderQueue from "@/components/ReminderQueue";
import WaitlistManager from "@/components/WaitlistManager";
import AddressLink from "@/components/AddressLink";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { getBaseJobMinutes } from "@/lib/baseJobEstimates";
import { removeUpcomingJobs } from "@/lib/inactiveCustomer";
import { formatCurrency, RECURRING_CONFIG, MULCH_CONFIG, getJobCrewSeconds } from "@/lib/lawnCare";
import { Search, Plus, Users, Phone, MapPin, ChevronRight, Edit, Trash2 } from "lucide-react";

export default function Customers() {
  const { data: customers = [], isLoading, createItem, updateItem, deleteItem } = useEntityCollection("Customer");
  const { data: allJobs = [], deleteItem: deleteJob } = useEntityCollection("Job");
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [sortByWorth, setSortByWorth] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const timedJobs = allJobs.filter((j) => j.status === "completed" && getJobCrewSeconds(j) > 0);
  const overallAvgHourly = timedJobs.length > 0
    ? timedJobs.reduce((s, j) => s + (j.price || 0), 0) / (timedJobs.reduce((s, j) => s + getJobCrewSeconds(j), 0) / 3600)
    : 0;
  const avgTimeHours = timedJobs.length > 0
    ? timedJobs.reduce((s, j) => s + getJobCrewSeconds(j), 0) / 3600 / timedJobs.length
    : 0;

  // Precompute each customer's $/hr (real from timed jobs, or estimated from base minutes).
  const customerValues = {};
  customers.forEach((c) => {
    const custTimed = timedJobs.filter((j) => j.customer_id === c.id);
    let hourly = 0, hasData = false, isEstimate = false;
    if (custTimed.length > 0) {
      const totalRev = custTimed.reduce((s, j) => s + (j.price || 0), 0);
      const totalSec = custTimed.reduce((s, j) => s + getJobCrewSeconds(j), 0);
      hourly = totalSec > 0 ? totalRev / (totalSec / 3600) : 0;
      hasData = true;
    } else {
      const baseMin = getBaseJobMinutes(c.name);
      if (baseMin > 0) {
        hourly = (c.set_price || 0) / (baseMin / 60);
        isEstimate = true;
      }
    }
    customerValues[c.id] = { hourly, hasData, isEstimate, bagged: c.mulch_type === "bagged" ? 1 : 0, hasValue: hasData || isEstimate };
  });

  // Worth % maps $/hr to a 0-100 scale with diminishing returns above $70,
  // so ~$67-70/hr lands around 80-90% and higher rates keep climbing toward 100.
  function hourlyToWorth(h) {
    if (h <= 13) return 0;
    if (h <= 60) return ((h - 13) / 47) * 75;        // 0% at $13 → 75% at $60
    if (h <= 67) return 75 + ((h - 60) / 7) * 5;      // 75% → 80%
    if (h <= 70) return 80 + ((h - 67) / 3) * 10;    // 80% → 90%
    return Math.min(99, 90 + 10 * (1 - Math.exp(-(h - 70) / 30))); // diminishing to ~100
  }

  function getCustomerValue(customerId) {
    const v = customerValues[customerId];
    if (!v || !v.hasValue) return { ratio: 0, hourly: 0, hasData: false, isEstimate: false, worth: 0 };
    let baseScore = hourlyToWorth(v.hourly);
    if (v.bagged) baseScore -= 5 + 0.14 * (100 - baseScore);
    const worth = Math.max(0, Math.min(100, Math.round(baseScore)));
    return { ratio: overallAvgHourly > 0 ? v.hourly / overallAvgHourly : 0, hourly: v.hourly, hasData: v.hasData, isEstimate: v.isEstimate, worth };
  }

  function valueColor(ratio) {
    if (ratio >= 1) return "text-emerald-400";
    if (ratio >= 0.75) return "text-amber-400";
    return "text-red-400";
  }
  function valueBg(ratio) {
    if (ratio >= 1) return "bg-emerald-500/10";
    if (ratio >= 0.75) return "bg-amber-500/10";
    return "bg-red-500/10";
  }
  function valueDot(ratio) {
    if (ratio >= 1) return "bg-emerald-400";
    if (ratio >= 0.75) return "bg-amber-400";
    return "bg-red-400";
  }
  function worthColor(worth) {
    const pct = Math.max(0, Math.min(100, worth));
    const hue = (pct / 100) * 120;
    const sat = 70 + (pct / 100) * 30;
    const light = 20 + (pct / 100) * 25;
    return { backgroundColor: `hsl(${hue}, ${sat}%, ${light}%)`, borderColor: `hsl(${hue}, ${sat}%, ${Math.max(0, light - 5)}%)` };
  }

  const filtered = customers.filter((c) => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.address?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterActive === "all" || (filterActive === "active" ? c.active : !c.active);
    return matchSearch && matchFilter;
  });

  const sorted = sortByWorth
    ? [...filtered].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return getCustomerValue(b.id).hourly - getCustomerValue(a.id).hourly;
      })
    : [...filtered].sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1));

  // Bottom 4 worst-paying active customers (lowest $/hr, tiebreak lowest total price)
  const worstIds = new Set(
    customers
      .filter((c) => c.active)
      .map((c) => ({ c, v: getCustomerValue(c.id) }))
      .filter((x) => x.v.hasData || x.v.isEstimate)
      .sort((a, b) => a.v.hourly - b.v.hourly || (a.c.set_price || 0) - (b.c.set_price || 0))
      .slice(0, 4)
      .map((x) => x.c.id)
  );

  if (isLoading) return <LoadingState />;

  const handleToggleActive = (c) => {
    if (c.active) removeUpcomingJobs(c.id, allJobs, deleteJob);
    updateItem({ id: c.id, active: !c.active });
  };

  const handleSave = (data) => {
    if (editCustomer) {
      if (data.active === false && editCustomer.active) removeUpcomingJobs(editCustomer.id, allJobs, deleteJob);
      updateItem({ id: editCustomer.id, ...data });
    } else {
      createItem(data);
    }
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total · ${customers.filter((c) => c.active).length} active`}
        action={<Button onClick={() => { setEditCustomer(null); setShowForm(true); }} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>}
      />

      <ReminderQueue />
      <WaitlistManager />

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or address..." className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-border">
          {["all", "active", "inactive"].map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filterActive === f ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortByWorth(!sortByWorth)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-border ${sortByWorth ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
        >
          Worth %
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" subtitle="Add your first customer to get started"
          action={<Button onClick={() => setShowForm(true)} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>} />
      ) : sortByWorth ? (
        <div className="space-y-1.5">
          {sorted.map((c) => {
            const val = getCustomerValue(c.id);
            return (
              <div key={c.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${worstIds.has(c.id) ? "ring-2 ring-red-500" : ""} ${c.active ? "" : "opacity-40"}`} style={c.active ? worthColor(val.worth) : { backgroundColor: "hsl(0 0% 14%)", borderColor: "hsl(0 0% 20%)" }}>
                <Link to={`/customers/${c.id}`} className="font-semibold text-sm text-white drop-shadow hover:underline">{c.name}</Link>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/90 font-medium drop-shadow">{val.hasData ? `${formatCurrency(val.hourly)}/hr` : val.isEstimate ? `~${formatCurrency(val.hourly)}/hr` : "—"}</span>
                  <span className="font-bold text-sm w-12 text-right text-white drop-shadow">{c.active ? `${val.worth}%` : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((c) => {
            const worst = worstIds.has(c.id);
            return (
            <div key={c.id} className={`group rounded-xl border-2 bg-card p-4 transition-all ${c.active ? "" : "opacity-40 grayscale"} ${worst ? "border-red-500 ring-1 ring-red-500/40" : "border-border hover:border-primary/40 hover:neon-glow"}`}>
              <Link to={`/customers/${c.id}`} className="block">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">{c.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {c.is_recurring && <Badge color="text-primary" bg="bg-primary/10">{RECURRING_CONFIG[c.recurring_rule]?.label}</Badge>}
                        {c.mulch_type && <Badge color="text-emerald-400" bg="bg-emerald-500/10">{MULCH_CONFIG[c.mulch_type]?.icon} {MULCH_CONFIG[c.mulch_type]?.label}</Badge>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {c.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <a
                        href={`tel:${c.phone.replace(/\D/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-primary transition-colors"
                      >{c.phone}</a>
                      <a
                        href={`sms:${c.phone.replace(/\D/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-primary"
                      >💬</a>
                    </p>
                  )}
                  {c.address && <p className="truncate"><AddressLink address={c.address} /></p>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <button
                    onClick={(e) => { e.preventDefault(); handleToggleActive(c); }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${c.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.active ? "bg-primary" : "bg-muted-foreground"}`} />
                    {c.active ? "Active" : "Inactive"}
                  </button>
                  <div className="flex items-center gap-2">
                  {(() => {
                    const val = getCustomerValue(c.id);
                    if (!c.active) return null;
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${valueBg(val.ratio)} ${valueColor(val.ratio)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${valueDot(val.ratio)}`} />
                          {val.worth}%
                        </span>
                        {(val.hasData || val.isEstimate) && (
                          <span className="text-[10px] text-muted-foreground font-medium">{val.isEstimate ? `~${formatCurrency(val.hourly)}/hr` : `${formatCurrency(val.hourly)}/hr`}</span>
                        )}
                      </>
                    );
                  })()}
                  {worst && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚠ LOW</span>}
                  <span className="font-semibold text-primary">{formatCurrency(c.set_price)}</span>
                  </div>
                </div>
              </Link>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditCustomer(c); setShowForm(true); }}>
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-500" onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteItem(c.id); }}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && setShowForm(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
            <CustomerForm customer={editCustomer} onSubmit={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}