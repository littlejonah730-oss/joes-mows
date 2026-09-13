import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Tax-ready bookkeeping export to Google Sheets.
// - mode: "status" → reports connector connection + last export info.
// - mode: "export" / default:
//     body.month = "YYYY-MM" → one spreadsheet for that month
//     body.year  = "YYYY"    → one spreadsheet covering the whole year
//     neither                   → previous month (scheduled monthly run)
//   Each spreadsheet has an Expenses tab (date, category, vendor,
//   description, amount, payment method, paid) and an Income tab (paid
//   invoices: date, customer, amount, payment method), with monthly totals,
//   YTD/year totals at the bottom of each tab.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    let accessToken = null;
    try {
      const conn = await b.connectors.getConnection("googlesheets");
      accessToken = conn?.accessToken || null;
    } catch (e) {
      accessToken = null;
    }
    if (!accessToken) {
      return Response.json({ ok: false, connected: false, error: "Google Sheets is not connected" });
    }

    if (body.mode === "status") {
      const settingsList = await b.entities.BusinessSettings.list("-created_date", 1);
      const s = settingsList?.[0] || {};
      return Response.json({
        ok: true,
        connected: true,
        last_export_month: s.last_expense_export_month || null,
        last_export_date: s.last_expense_export_date || null,
        last_export_url: s.last_expense_export_url || null,
      });
    }

    // Resolve the export target
    let year, month = null;
    if (body.year && /^\d{4}$/.test(String(body.year))) {
      year = parseInt(String(body.year), 10);
    } else if (body.month && /^\d{4}-\d{2}$/.test(body.month)) {
      year = parseInt(body.month.slice(0, 4), 10);
      month = parseInt(body.month.slice(5, 7), 10) - 1;
    } else {
      const now = new Date();
      year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    }
    const isYear = month == null;
    const exportLabel = isYear ? String(year) : `${MONTHS[month]} ${year}`;
    const spreadsheetTitle = `LawnFlow Expenses - ${exportLabel}`;

    const [expenses, invoices] = await Promise.all([
      b.entities.Expense.list("-date", 5000),
      b.entities.Invoice.list("-created_date", 5000),
    ]);

    const monthBounds = (m) => {
      const mm = String(m + 1).padStart(2, "0");
      const lastDay = new Date(year, m + 1, 0).getDate();
      return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
    };
    const inRange = (d, start, end) => {
      const s = String(d || "").slice(0, 10);
      return s >= start && s <= end;
    };
    const round2 = (n) => Math.round(n * 100) / 100;

    const expenseRowsFor = (start, end) => (expenses || [])
      .filter((e) => inRange(e.date, start, end))
      .map((e) => [
        String(e.date || "").slice(0, 10),
        e.category || "",
        e.vendor || "",
        e.description || "",
        e.amount != null ? Number(e.amount) : 0,
        e.payment_method || "",
        e.paid ? "Yes" : "No",
      ])
      .sort((a, c) => String(a[0]).localeCompare(String(c[0])));

    const incomeRowsFor = (start, end) => (invoices || [])
      .filter((i) => i.status === "paid" && inRange(i.paid_date, start, end))
      .map((i) => [
        String(i.paid_date || "").slice(0, 10),
        i.customer_name || "",
        i.amount != null ? Number(i.amount) : 0,
        i.payment_method && i.payment_method !== "none" ? i.payment_method : "",
      ])
      .sort((a, c) => String(a[0]).localeCompare(String(c[0])));

    const expenseHeader = ["Date", "Category", "Vendor", "Description", "Amount", "Payment Method", "Paid"];
    const incomeHeader = ["Date", "Customer", "Amount", "Payment Method"];

    let expenseValues, incomeValues, summary;

    if (isYear) {
      // Whole year: every month's rows followed by a monthly total row,
      // then a year total at the bottom.
      expenseValues = [expenseHeader];
      incomeValues = [incomeHeader];
      let expYear = 0, incYear = 0, expCount = 0, incCount = 0, monthsWithData = 0;
      for (let m = 0; m < 12; m++) {
        const { start, end } = monthBounds(m);
        const er = expenseRowsFor(start, end);
        const ir = incomeRowsFor(start, end);
        if (er.length === 0 && ir.length === 0) continue;
        monthsWithData++;
        const eT = round2(er.reduce((s, r) => s + (Number(r[4]) || 0), 0));
        const iT = round2(ir.reduce((s, r) => s + (Number(r[2]) || 0), 0));
        expenseValues.push(...er, [`TOTAL — ${MONTHS[m]} ${year}`, "", "", "", eT, "", ""]);
        incomeValues.push(...ir, [`TOTAL — ${MONTHS[m]} ${year}`, "", iT, ""]);
        expYear += eT;
        incYear += iT;
        expCount += er.length;
        incCount += ir.length;
      }
      expenseValues.push([], [`YEAR TOTAL — ${year}`, "", "", "", round2(expYear), "", ""]);
      incomeValues.push([], [`YEAR TOTAL — ${year}`, "", round2(incYear), ""]);
      summary = { months: monthsWithData, expenses: expCount, income: incCount, expense_total: round2(expYear), income_total: round2(incYear) };
    } else {
      // Single month with monthly + YTD totals
      const { start, end } = monthBounds(month);
      const er = expenseRowsFor(start, end);
      const ir = incomeRowsFor(start, end);
      const expenseTotal = round2(er.reduce((s, r) => s + (Number(r[4]) || 0), 0));
      const incomeTotal = round2(ir.reduce((s, r) => s + (Number(r[2]) || 0), 0));
      const yearStart = `${year}-01-01`;
      const expenseYtd = round2((expenses || []).filter((e) => inRange(e.date, yearStart, end)).reduce((s, e) => s + (e.amount || 0), 0));
      const incomeYtd = round2((invoices || []).filter((i) => i.status === "paid" && inRange(i.paid_date, yearStart, end)).reduce((s, i) => s + (i.amount || 0), 0));
      expenseValues = [
        expenseHeader,
        ...er,
        [],
        [`TOTAL — ${exportLabel}`, "", "", "", expenseTotal, "", ""],
        [`YTD TOTAL — ${year}`, "", "", "", expenseYtd, "", ""],
      ];
      incomeValues = [
        incomeHeader,
        ...ir,
        [],
        [`TOTAL — ${exportLabel}`, "", incomeTotal, ""],
        [`YTD TOTAL — ${year}`, "", incomeYtd, ""],
      ];
      summary = { expenses: er.length, income: ir.length, expense_total: expenseTotal, income_total: incomeTotal };
    }

    // Create the spreadsheet with Expenses + Income tabs
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { title: spreadsheetTitle },
        sheets: [
          { properties: { title: "Expenses" } },
          { properties: { title: "Income" } },
        ],
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return Response.json({ ok: false, connected: true, error: created?.error?.message || "Failed to create spreadsheet" }, { status: 502 });
    }

    async function writeTab(range, values) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to write ${range}`);
      }
    }

    await writeTab(`Expenses!A1:G${expenseValues.length}`, expenseValues);
    await writeTab(`Income!A1:D${incomeValues.length}`, incomeValues);

    // Record the export on business settings
    const settingsList = await b.entities.BusinessSettings.list("-created_date", 1);
    if (settingsList?.[0]?.id) {
      await b.entities.BusinessSettings.update(settingsList[0].id, {
        last_expense_export_month: exportLabel,
        last_expense_export_date: new Date().toISOString().slice(0, 10),
        last_expense_export_url: created.spreadsheetUrl,
      });
    }

    return Response.json({ ok: true, connected: true, month: exportLabel, ...summary, url: created.spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}