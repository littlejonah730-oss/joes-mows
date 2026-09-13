import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Tax Export tool: push a month or a whole year of expenses + income to a
// tax-ready Google Sheet (Expenses tab + Income tab with totals).
export default function TaxExport() {
  const [status, setStatus] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions.invoke("exportExpensesToSheets", { mode: "status" })
      .then((res) => setStatus(res?.data || { connected: false }))
      .catch(() => setStatus({ connected: false }));
  }, []);

  const now = new Date();
  const monthOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    for (let m = 0; m < 12; m++) {
      monthOptions.push({ value: `${y}-${String(m + 1).padStart(2, "0")}`, label: `${MONTH_NAMES[m]} ${y}` });
    }
  }
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  async function runExport(kind) {
    setBusy(kind);
    setError("");
    setResult(null);
    try {
      const payload = kind === "month" ? { month } : { year };
      const res = await base44.functions.invoke("exportExpensesToSheets", payload);
      const d = res?.data || {};
      if (d.ok) setResult(d);
      else setError(d.error || "Export failed");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Export failed");
    }
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1">
        <FileSpreadsheet className="w-4 h-4 text-primary" /> Tax Export to Google Sheets
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Exports a tax-ready spreadsheet (Expenses tab + Income tab with monthly and year-to-date totals) to your Google account.
      </p>

      {status && !status.connected && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Google Sheets isn't connected — say <span className="text-primary font-medium">"Connect Google Sheets"</span> in your app builder chat to authorize it.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground mb-1 block">Export a single month</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Choose a month…</option>
              {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button
            className="bg-primary text-black hover:bg-primary/90 shrink-0"
            disabled={!month || busy !== null}
            onClick={() => runExport("month")}
          >
            {busy === "month" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Export Month
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground mb-1 block">Export the whole year</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button
            className="bg-primary text-black hover:bg-primary/90 shrink-0"
            disabled={busy !== null}
            onClick={() => runExport("year")}
          >
            {busy === "year" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Export Year
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/30">
          <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Exported {result.month}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.expenses} expense${result.expenses === 1 ? "" : "s"} (${Number(result.expense_total || 0).toFixed(2)}) · {result.income} income entr${result.income === 1 ? "y" : "ies"} (${Number(result.income_total || 0).toFixed(2)})
          </p>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1.5">
            Open spreadsheet <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}