import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    const [invoices, settingsList] = await Promise.all([
      b.entities.Invoice.list("-created_date", 2000),
      b.entities.BusinessSettings.list("-created_date", 5),
    ]);
    const settings = settingsList?.[0] || {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    let overdueCustomers = 0;

    // Today's-jobs alerts (owner gets pay detail, employees get their own
    // jobs) are sent separately by sendDailySchedule after this digest runs.

    // Customers who haven't paid within the threshold
    const thresholdDays = Number(settings.overdue_notification_days) > 0 ? Number(settings.overdue_notification_days) : 14;
    const late = invoices.filter((i) => {
      if (i.status !== "unpaid" || !i.due_date) return false;
      const due = new Date(String(i.due_date).slice(0, 10) + "T00:00:00");
      return (today - due) / DAY_MS >= thresholdDays;
    });

    const byCustomer = {};
    late.forEach((i) => {
      if (!byCustomer[i.customer_id]) byCustomer[i.customer_id] = { name: i.customer_name || "Customer", amount: 0, count: 0 };
      byCustomer[i.customer_id].amount += i.amount || 0;
      byCustomer[i.customer_id].count += 1;
    });
    overdueCustomers = Object.keys(byCustomer).length;

    // Remind once per week per customer (dedup key includes the Monday of this week)
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay());
    const mondayStr = monday.toISOString().slice(0, 10);

    for (const [cid, info] of Object.entries(byCustomer)) {
      await notifyAndPush(b, {
        type: "overdue_payment",
        title: `${info.name} hasn't paid`,
        body: `$${info.amount.toFixed(2)} overdue across ${info.count} invoice${info.count === 1 ? "" : "s"} (${thresholdDays}+ days past due)`,
        severity: "warning",
        dedup_key: `overdue_${cid}_${mondayStr}`,
        related_id: cid,
        link: "/invoices",
      });
    }

    return Response.json({ ok: true, overdueCustomers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}