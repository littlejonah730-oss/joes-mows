import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { ROLE_CONFIG, PROMOTION_PATH, PROMOTION_THRESHOLDS, formatCurrency, formatDateShort, getJobEmployeePay, getTargetReward, getRewardProgress } from "@/lib/lawnCare";
import RewardProgressBar from "@/components/RewardProgressBar";
import { Phone, KeyRound, Edit, Trash2, UserPlus, UserMinus, MessageSquare, Send } from "lucide-react";
import PostJobDialog from "@/components/PostJobDialog";

export default function EmployeeDetailDialog({ employee, allJobs, customers, onPostJob, onUpdate, onDelete, onEdit, onMessage, onClose }) {
  const [showPostJob, setShowPostJob] = useState(false);
  const { data: rewards = [] } = useEntityCollection("Reward");
  if (!employee) return null;

  // Auto-advance: the goal is always the next reward tier above this employee's progress.
  const targetReward = getTargetReward(rewards, getRewardProgress(employee));

  const role = ROLE_CONFIG[employee.role] || ROLE_CONFIG.greenhorn;
  const score = employee.reliability_score ?? 100;
  const yards = employee.yards_completed ?? 0;
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const promotionThreshold = PROMOTION_THRESHOLDS[employee.role];
  const canPromote = promotionThreshold && yards >= promotionThreshold && PROMOTION_PATH[employee.role];

  const myJobs = allJobs
    .filter((j) => j.claimed_by_employee_id === employee.id)
    .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
    .slice(0, 5);

  const totalEarned = allJobs
    .filter((j) => j.claimed_by_employee_id === employee.id && j.status === "completed")
    .reduce((sum, j) => sum + getJobEmployeePay(j), 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{employee.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <p>{employee.name}</p>
              <Badge color={role.color} bg={role.bg}>{role.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{role.description}</p>
          </div>

          <RewardProgressBar
            progress={getRewardProgress(employee)}
            goal={targetReward?.jobs_required ?? employee.reward_goal ?? 10}
            rewardName={targetReward?.name}
            rewardDescription={targetReward?.description}
          />

          <div className="space-y-2">
            {employee.phone && (
              <a href={`tel:${employee.phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-muted-foreground" /> {employee.phone}
              </a>
            )}
            {employee.pin && (
              <p className="flex items-center gap-2 text-sm text-primary">
                <KeyRound className="w-4 h-4" /> PIN: {employee.pin}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Earned</p>
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalEarned)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2 text-center">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Reliability</p>
              <p className={`text-sm font-bold ${scoreColor}`}>{score}</p>
              <div className="flex gap-1 justify-center mt-1">
                <button onClick={() => onUpdate({ id: employee.id, reliability_score: Math.max(0, score - 5) })} className="w-5 h-5 rounded bg-red-500/20 text-red-400 text-xs font-bold">−</button>
                <button onClick={() => onUpdate({ id: employee.id, reliability_score: Math.min(100, score + 5) })} className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">+</button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-2 text-center">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Jobs</p>
              <p className="text-sm font-bold text-primary">{yards}</p>
              <div className="flex gap-1 justify-center mt-1">
                <button onClick={() => onUpdate({ id: employee.id, yards_completed: Math.max(0, yards - 1), reward_progress: Math.max(0, yards - 1) })} className="w-5 h-5 rounded bg-muted text-muted-foreground text-xs font-bold">−</button>
                <button onClick={() => onUpdate({ id: employee.id, yards_completed: yards + 1, reward_progress: yards + 1 })} className="w-5 h-5 rounded bg-primary/20 text-primary text-xs font-bold">+</button>
              </div>
            </div>
          </div>

          {canPromote && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">READY FOR PROMOTION</span>
              <button onClick={() => onUpdate({ id: employee.id, role: PROMOTION_PATH[employee.role] })} className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors">Promote to {ROLE_CONFIG[PROMOTION_PATH[employee.role]].label}</button>
            </div>
          )}

          {myJobs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent Jobs</p>
              <div className="space-y-1">
                {myJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{job.customer_name}</p>
                      <p className="text-muted-foreground">{formatDateShort(job.scheduled_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(job.price)}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{job.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {employee.notes && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Notes</p>
              <p className="text-xs">{employee.notes}</p>
            </div>
          )}

          <Button size="sm" className="w-full bg-primary text-black hover:bg-primary/90" onClick={() => setShowPostJob(true)}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Post Exclusive Job
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {employee.phone && (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => window.location.href = `tel:${employee.phone}`}>
                <Phone className="w-3 h-3 mr-1" /> Call
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { onMessage(employee.id); onClose(); }}>
              <MessageSquare className="w-3 h-3 mr-1" /> Message
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { onEdit(employee); onClose(); }}>
              <Edit className="w-3 h-3 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { onUpdate({ id: employee.id, active: employee.active === false }); onClose(); }}>
              {employee.active === false ? <><UserPlus className="w-3 h-3 mr-1" /> Activate</> : <><UserMinus className="w-3 h-3 mr-1" /> Deactivate</>}
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="text-xs text-red-400 w-full" onClick={() => { if (confirm("Delete this employee?")) { onDelete(employee.id); onClose(); } }}>
            <Trash2 className="w-3 h-3 mr-1" /> Delete Employee
          </Button>
        </div>
      </DialogContent>
      {showPostJob && (
        <PostJobDialog employee={employee} customers={customers || []} onPost={onPostJob} onClose={() => setShowPostJob(false)} />
      )}
    </Dialog>
  );
}