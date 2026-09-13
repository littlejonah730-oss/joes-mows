import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

// Owner money & stats summary. mode "weekly" (Mon 6 AM, covers the past 7
// days) or "monthly" (1st 6 AM, covers the previous calendar month).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "monthly" ? "monthly" : "weekly";

    const now = new Date();
    let start, end, label;
    if (mode === "monthly") {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      label = start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    } else {
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = "the past week";
    }
    const inRange = (iso) => {
      if (!iso) return false;
      const t = new Date(String(iso).slice(0, 10) + "T00:00:00Z").getTime();
      return t >= start.getTime() && t < end.getTime();
    };

    const doneJobs = (await b.entities.Job.filter({ status: "completed" })).filter((j) => inRange(j.completed_date));
    const revenue = doneJobs.reduce((s, j) => s + (j.price || 0), 0);

    const expenses = await b.entities.Expense.list("-date", 500);
    const periodExpenses = (expenses || []).filter((e) => inRange(e.date));
    const paidExpenses = periodExpenses.filter((e) => e.paid !== false).reduce((s, e) => s + (e.amount || 0), 0);
    const unpaidExpenses = periodExpenses.filter((e) => e.paid === false).reduce((s, e) => s + (e.amount || 0), 0);
    const profit = revenue - paidExpenses;

    const todayStr = now.toISOString().slice(0, 10);
    const invoices = await b.entities.Invoice.filter({ status: "unpaid" });
    const outstanding = (invoices || []).reduce((s, i) => s + (i.amount || 0), 0);
    const overdueList = (invoices || []).filter((i) => i.due_date && String(i.due_date).slice(0, 10) < todayStr);
    const overdueTotal = overdueList.reduce((s, i) => s + (i.amount || 0), 0);

    const money = (n) => "$" + n.toFixed(2);
    const parts = [
      `${doneJobs.length} jobs completed in ${label}`,
      `Revenue ${money(revenue)}`,
      `Expenses ${money(paidExpenses)}${unpaidExpenses > 0 ? ` (+${money(unpaidExpenses)} unpaid)` : ""}`,
      `Profit ${money(profit)}`,
      `Outstanding invoices ${money(outstanding)}`,
    ];
    if (overdueList.length > 0) {
      parts.push(`${money(overdueTotal)} overdue from ${overdueList.length} invoice${overdueList.length === 1 ? "" : "s"}`);
    }

    await notifyAndPush(b, {
      type: "money_summary",
      title: mode === "monthly" ? `Monthly summary — ${label}` : "Weekly business summary",
      body: parts.join(" · ").slice(0, 500),
      severity: profit >= 0 ? "success" : "warning",
      dedup_key: `money_${mode}_${start.toISOString().slice(0, 10)}`,
      link: "/reports",
    });

    return Response.json({ ok: true, mode, revenue, profit, jobs: doneJobs.length, overdue: overdueList.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}