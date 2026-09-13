import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatDate } from "@/lib/lawnCare";
import { BellRing, Copy, Check } from "lucide-react";

export default function ReminderQueue() {
  const { data: jobs = [] } = useEntityCollection("Job", { sort: "scheduled_date", limit: 500 });
  const { data: settingsList = [] } = useEntityCollection("BusinessSettings", { sort: "-created_date", limit: 1 });
  const businessName = settingsList[0]?.business_name || "our team";
  const [copiedId, setCopiedId] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const due = jobs.filter(
    (j) =>
      ["scheduled", "in_progress"].includes(j.status) &&
      (j.scheduled_date || "") >= todayStr &&
      (j.scheduled_date || "") <= tomorrowStr
  );
  if (due.length === 0) return null;

  async function copyReminder(job) {
    const msg = `Hi ${job.customer_name}, ${businessName} here — confirming we're scheduled for your ${job.job_type} on ${formatDate(job.scheduled_date)}. Reply anytime if you need to reschedule.`;
    try {
      await navigator.clipboard.writeText(msg);
    } catch {}
    setCopiedId(job.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <BellRing className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Reminders to send</h3>
        <span className="text-[10px] text-muted-foreground">
          {due.length} job{due.length === 1 ? "" : "s"} today or tomorrow
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">Tap copy, then paste it to the customer however you reach them.</p>
      <div className="space-y-1.5">
        {due.map((job) => (
          <div key={job.id} className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{job.customer_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {job.job_type} · {formatDate(job.scheduled_date)}
              </p>
            </div>
            <button
              onClick={() => copyReminder(job)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors select-none shrink-0"
            >
              {copiedId === job.id ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}