import { getChecklist, getTaskStatus } from "@/lib/equipmentMaintenance";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle2 } from "lucide-react";

// Checklist panel shown in an equipment item's detail dialog.
// Every task has its own "Mark Done" button — onMarkDone(taskId) resets ONLY
// that task's counter and stamps that task's own last-done date to today;
// the other tasks on the same piece of equipment are untouched.
export default function EquipmentMaintenanceList({ equipment, usageRecords, onMarkDone }) {
  if (!equipment) return null;
  const statuses = getChecklist(equipment).map((t) => getTaskStatus(equipment, t, usageRecords));

  return (
    <div className="rounded-lg border border-border p-3 space-y-2.5">
      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5">
        <Wrench className="w-3 h-3 text-primary" /> Maintenance Checklist
      </p>
      {statuses.map((st) => {
        const overdue = st.overdueJobs > 0 || st.overdueDays > 0;
        const tone = st.due ? (overdue ? "text-red-400" : "text-amber-400") : "text-muted-foreground";
        let sub;
        if (st.task.everyJobs) sub = `${st.jobsSince}/${st.task.everyJobs} jobs since last service`;
        else if (st.seasonal) sub = "Once a season";
        else sub = "Calendar interval";
        sub += st.lastDone ? ` · last: ${st.lastDone}` : " · never done";
        if (st.due) {
          if (st.overdueJobs > 0) sub += ` · OVERDUE by ${st.overdueJobs} job${st.overdueJobs === 1 ? "" : "s"}`;
          else if (st.overdueDays > 0) sub += ` · OVERDUE by ${st.overdueDays} day${st.overdueDays === 1 ? "" : "s"}`;
          else sub += " · DUE NOW";
        }
        return (
          <div key={st.task.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-xs font-medium ${st.due ? "" : "text-muted-foreground"}`}>{st.task.label}</p>
              <p className={`text-[10px] font-medium ${tone}`}>{sub}</p>
            </div>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[10px] shrink-0"
              onClick={() => onMarkDone(st.task.id)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Done
            </Button>
          </div>
        );
      })}
    </div>
  );
}