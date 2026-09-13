import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatDateShort, formatDayOfWeek, formatCurrency, ROLE_CONFIG, PROMOTION_PATH, getJobEmployeePay, getTargetReward, getRewardProgress } from "@/lib/lawnCare";
import RewardProgressBar from "@/components/RewardProgressBar";
import EmployeeChat from "@/components/EmployeeChat";
import KudosPopup from "@/components/KudosPopup";
import EmployeeBadges from "@/components/EmployeeBadges";
import FinishedProductTab from "@/components/employee/FinishedProductTab";
import PushEnableButton from "@/components/PushEnableButton";
import { runJobCompletion } from "@/lib/jobCompletion";
import confetti from "canvas-confetti";
import {
  ChevronLeft, MapPin, Calendar, CheckCircle2, User, LogOut,
  DollarSign, KeyRound, Send, AlertTriangle, Shield, Award,
  Home as HomeIcon, Briefcase, MessageCircle, Gift, Camera,
  ChevronDown, ChevronUp, Flame, Phone, Play,
} from "lucide-react";

const SOLO_RATE = 0.65;
const HELPING_RATE = 0.40;

function JobCard({ job, onClaim, onRelease, onStart, onComplete, isMine, isTaken, employeeRole, onProbation, soloRate = SOLO_RATE, helpingRate = HELPING_RATE }) {
  const assignment = job.employee_assignment || "helping";
  const todayStr = new Date().toISOString().slice(0, 10);
  const isDone = job.status === "completed" || job.scheduled_date < todayStr;
  const soloPayout = (job.price || 0) * soloRate;
  const helpingPayout = (job.price || 0) * helpingRate;
  const customPay = job.custom_employee_pay != null && job.custom_employee_pay !== "" ? Number(job.custom_employee_pay) : null;
  const canSoloRole = employeeRole === "operator" || employeeRole === "foreman" || employeeRole === "specialist";
  const canClaim = !onProbation && (assignment === "urgent" || assignment === "helping" || (assignment === "solo" && canSoloRole));
  const isCancelled = job.status === "cancelled";

  if (isCancelled) {
    return (
      <div className="relative rounded-xl border border-red-500/60 bg-card p-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-red-500/80 border-2 border-red-500/60 px-3 py-1 rounded -rotate-12 tracking-widest">CANCELLED</span>
        </div>
        <div className="blur-[1px] opacity-70">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm">{job.customer_name}</p>
              <p className="text-xs text-muted-foreground">{job.job_type}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{formatDateShort(job.scheduled_date)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{formatDayOfWeek(job.scheduled_date)}</p>
            </div>
          </div>
          {job.customer_address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3 shrink-0" /> {job.customer_address}</p>
          )}
        </div>
        <p className="text-[10px] font-bold text-red-400 text-center mt-2">This job was cancelled</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border bg-card p-4 transition-all ${isDone ? "opacity-40 grayscale" : ""} ${job.exclusive_to_employee_id ? "border-primary/60 ring-1 ring-primary/40 neon-glow" : assignment === "urgent" ? "border-red-500 ring-2 ring-red-500/50" : assignment === "solo" ? "border-amber-500/50 ring-1 ring-amber-500/30" : isMine ? "border-primary/40 neon-glow" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm">{job.customer_name}</p>
            {job.exclusive_to_employee_id && <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">🔒 JUST FOR YOU</span>}
          </div>
          <p className="text-xs text-muted-foreground">{job.job_type}{job.difficulty ? <span className="text-amber-400 ml-1">{"★".repeat(job.difficulty)}{"☆".repeat(5 - job.difficulty)}</span> : ""}</p>
          {assignment === "urgent" && <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded mt-0.5 inline-block animate-pulse">⚠ URGENT</span>}
          {job.needs_help && <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">NEEDS HELP</span>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{formatDateShort(job.scheduled_date)}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{formatDayOfWeek(job.scheduled_date)}</p>
          {assignment === "solo" && <span className="text-[10px] font-bold text-amber-400">SOLO</span>}
        </div>
      </div>
      {job.customer_address && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="w-3 h-3 shrink-0" /> {job.customer_address}</p>
      )}
      <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-muted/40">
        <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="flex items-center gap-2 text-xs">
          {customPay != null ? (
            <span className="font-bold text-primary">Payout: ${customPay.toFixed(2)}</span>
          ) : (
            <>
              <span className={assignment === "solo" || assignment === "urgent" ? "font-bold text-amber-400" : "text-muted-foreground"}>Solo: ${soloPayout.toFixed(2)}</span>
              <span className="text-muted-foreground/50">|</span>
              <span className={assignment === "helping" ? "font-bold text-primary" : "text-muted-foreground"}>Helping: ${helpingPayout.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
      {job.timer_started_at && !job.timer_duration_seconds && (
        <p className="text-[10px] text-amber-400 flex items-center gap-1 mb-2">⏱ Timer running</p>
      )}
      {job.timer_duration_seconds > 0 && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">⏱ {Math.floor(job.timer_duration_seconds / 60)}m {job.timer_duration_seconds % 60}s</p>
      )}
      {isTaken ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <User className="w-3.5 h-3.5" /> Claimed by {job.claimed_by_name}
        </div>
      ) : isMine ? (
        isDone ? (
          <div className="w-full py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs font-medium text-center">Completed</div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              {job.status === "in_progress" ? (
                <div className="flex-1 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold text-center">⏱ Job Started</div>
              ) : (
                <button onClick={() => onStart(job)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors active:scale-[0.97] select-none">Start Job</button>
              )}
              <button onClick={() => onComplete(job)} className="flex-1 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors active:scale-[0.97] select-none">Mark Done</button>
            </div>
            <button onClick={() => onRelease(job)} className="w-full py-1.5 rounded-lg bg-muted/60 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors select-none">Release job back</button>
          </div>
        )
      ) : !canClaim ? (
        <div className="w-full py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs font-medium text-center">
          {onProbation ? "🔒 On Probation — Earn Back Trust" : "🔒 Solo Needs Lead Rank"}
        </div>
      ) : (
        <button onClick={() => onClaim(job)} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">I'm Available</button>
      )}
    </div>
  );
}

export default function EmployeePortal({ onBack, onSwitchToAdmin, employeeId }) {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [initError, setInitError] = useState(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const { data: allJobs = [], isLoading: jobsLoading, updateItem, createItem: createJobItem } = useEntityCollection("Job", { sort: "-scheduled_date" });
  const { data: allMessages = [], createItem: createMessage } = useEntityCollection("Message");
  const { data: allAnnouncements = [] } = useEntityCollection("Announcement", { sort: "-created_date" });
  const { data: allBadges = [] } = useEntityCollection("Badge");
  const { data: allAssignments = [] } = useEntityCollection("BadgeAssignment");
  const { data: allEmployees = [], updateItem: updateEmployee } = useEntityCollection("Employee");
  const { data: allRewards = [] } = useEntityCollection("Reward");
  const { createItem: createInvoice } = useEntityCollection("Invoice");
  const { createItem: createExpense } = useEntityCollection("Expense");
  const [activeTab, setActiveTab] = useState("home");
  const [showBadges, setShowBadges] = useState(false);
  const [showKudos, setShowKudos] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [showCommitPopup, setShowCommitPopup] = useState(false);
  const [commitPopupText, setCommitPopupText] = useState("");
  const [jobsSub, setJobsSub] = useState("available");

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        if (employeeId) {
          const emp = await base44.entities.Employee.get(employeeId);
          setEmployee(emp);
        } else {
          const user = await base44.auth.me();
          const employees = await base44.entities.Employee.list("-created_date", 500);
          let emp = employees.find((e) => e.user_id === user.id);
          if (!emp) {
            emp = await base44.entities.Employee.create({
              name: user.full_name || user.email || "New Employee",
              user_id: user.id, active: true, role: "greenhorn",
            });
          }
          setEmployee(emp);
          if (emp.pin) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const sessions = JSON.parse(localStorage.getItem("lawnflow_pin_sessions") || "{}");
              sessions[emp.pin] = { access_token: session.access_token, refresh_token: session.refresh_token };
              localStorage.setItem("lawnflow_pin_sessions", JSON.stringify(sessions));
              localStorage.setItem("lawnflow_my_pin", emp.pin);
            }
          } else if (!localStorage.getItem("lawnflow_my_pin")) {
            setShowPinSetup(true);
          }
          if (emp.kudos_message && !emp.kudos_read) {
            setShowKudos(true);
            try { await base44.entities.Employee.update(emp.id, { kudos_read: true }); } catch (e) { console.error(e); }
          }
        }
      } catch (err) {
        console.error("Employee portal init error:", err);
        const { data: { session } } = await supabase.auth.getSession();
        if (!employeeId && (err?.status === 401 || err?.status === 403 || !session)) {
          window.location.href = "/login";
          return;
        }
        setInitError(err?.message || "Failed to load employee portal.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [employeeId]);

  const highlightedJobs = allJobs.filter((j) => {
    if (j.exclusive_to_employee_id && j.exclusive_to_employee_id !== employee?.id) return false;
    return j.highlighted;
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const available = highlightedJobs.filter((j) => !j.claimed_by_employee_id && j.scheduled_date >= todayStr && j.status !== "cancelled");
  const mine = highlightedJobs
    .filter((j) => j.claimed_by_employee_id === employee?.id)
    .sort((a, b) => {
      const aExcl = a.exclusive_to_employee_id ? 0 : 1;
      const bExcl = b.exclusive_to_employee_id ? 0 : 1;
      if (aExcl !== bExcl) return aExcl - bExcl;
      return new Date(a.scheduled_date + "T00:00:00") - new Date(b.scheduled_date + "T00:00:00");
    });
  const myAssignments = allAssignments.filter((a) => a.employee_id === employee?.id);
  const taken = highlightedJobs.filter((j) => j.claimed_by_employee_id && j.claimed_by_employee_id !== employee?.id && j.status !== "cancelled");
  const myMessages = allMessages.filter((m) => m.employee_id === employee?.id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const myAnnouncements = allAnnouncements.filter((a) => {
    if (!employee) return false;
    if (a.target_type === "all") return true;
    if (a.target_type === "role" && a.target_role === employee.role) return true;
    if (a.target_type === "individual" && a.target_employee_id === employee.id) return true;
    return false;
  });
  const empScore = employee?.reliability_score ?? 100;
  const currentTier = empScore >= 80 ? "good" : empScore >= 50 ? "warning" : "probation";
  const currentSoloRate = currentTier === "good" ? SOLO_RATE : currentTier === "warning" ? 0.55 : 0.45;
  const currentHelpingRate = currentTier === "good" ? HELPING_RATE : currentTier === "warning" ? 0.35 : 0.30;
  const onProbation = currentTier === "probation";
  const myEarnings = allJobs
    .filter((j) => j.claimed_by_employee_id === employee?.id && j.status === "completed")
    .reduce((sum, j) => sum + getJobEmployeePay(j), 0);
  const myJobsDone = employee?.yards_completed ?? 0;

  const myCompletedDates = [...new Set(
    allJobs.filter((j) => j.claimed_by_employee_id === employee?.id && j.status === "completed" && j.completed_date)
      .map((j) => j.completed_date.slice(0, 10))
  )].sort().reverse();
  let streak = 0;
  if (myCompletedDates.length > 0) {
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (const dateStr of myCompletedDates) {
      const jobDate = new Date(dateStr + "T00:00:00");
      const diffDays = Math.round((checkDate - jobDate) / 86400000);
      if (diffDays === streak) streak++;
      else if (diffDays > streak) break;
    }
  }

  const availableByDate = [];
  available.forEach((job) => {
    let group = availableByDate.find((g) => g.date === job.scheduled_date);
    if (!group) { group = { date: job.scheduled_date, jobs: [] }; availableByDate.push(group); }
    group.jobs.push(job);
  });
  availableByDate.sort((a, b) => new Date(a.date + "T00:00:00") - new Date(b.date + "T00:00:00"));

  const mineByDate = [];
  mine.forEach((job) => {
    let group = mineByDate.find((g) => g.date === job.scheduled_date);
    if (!group) { group = { date: job.scheduled_date, jobs: [] }; mineByDate.push(group); }
    group.jobs.push(job);
  });
  mineByDate.sort((a, b) => new Date(a.date + "T00:00:00") - new Date(b.date + "T00:00:00"));

  function getJobPayout(job) {
    if (job.custom_employee_pay != null && job.custom_employee_pay !== "") return Number(job.custom_employee_pay);
    const assignment = job.employee_assignment || "helping";
    const rate = assignment === "solo" || assignment === "urgent" ? currentSoloRate : currentHelpingRate;
    return (job.price || 0) * rate;
  }
  function getDayTotal(date, jobs) {
    const total = jobs.reduce((s, j) => s + getJobPayout(j), 0);
    const allForDate = highlightedJobs.filter((j) => j.scheduled_date === date);
    const allClaimed = allForDate.length > 0 && allForDate.every((j) => j.claimed_by_employee_id === employee?.id);
    return { total: allClaimed ? Math.ceil(total / 10) * 10 : total, allClaimed };
  }

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Auto-advance: the goal is always the next reward tier above the employee's
  // progress (e.g. 13 yards → going for the 20-yard reward, then the next one).
  const rewardProgress = getRewardProgress(employee);
  const targetReward = getTargetReward(allRewards, rewardProgress);
  const rewardGoal = targetReward?.jobs_required ?? employee?.reward_goal ?? 10;

  function handleClaim(job) {
    if (job.claimed_by_employee_id || !employee) return;
    if (onProbation) return;
    if (job.scheduled_date < todayStr) return;
    if (job.employee_assignment === "solo" && !["operator", "foreman", "specialist"].includes(employee.role)) return;
    updateItem({ id: job.id, claimed_by_employee_id: employee.id, claimed_by_name: employee.name, claimed_at: new Date().toISOString() });
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setCommitPopupText(`You're booked for ${job.customer_name} on ${formatDateShort(job.scheduled_date)}! Show up ready to work.`);
    setShowCommitPopup(true);
  }
  function handleRelease(job) {
    updateItem({ id: job.id, claimed_by_employee_id: "", claimed_by_name: "", claimed_at: null });
  }
  function handleStartJob(job) {
    updateItem({ id: job.id, status: "in_progress", timer_started_at: new Date().toISOString(), started_by_name: employee?.name || "Crew" });
  }
  function handleCompleteJob(job) {
    runJobCompletion(job, {
      employees: allEmployees,
      jobs: allJobs,
      updateJob: updateItem,
      createInvoice,
      createExpense,
      updateEmployee,
      createNextJob: createJobItem,
    });
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    setCommitPopupText(`${job.customer_name} marked complete — the invoice was sent to the owner. Nice work! 💪`);
    setShowCommitPopup(true);
  }
  function handleClaimAll(jobs) {
    if (!employee || onProbation) return;
    let claimed = 0;
    jobs.forEach((job) => {
      if (!job.claimed_by_employee_id && !(job.employee_assignment === "solo" && !["operator", "foreman", "specialist"].includes(employee.role))) {
        updateItem({ id: job.id, claimed_by_employee_id: employee.id, claimed_by_name: employee.name, claimed_at: new Date().toISOString() });
        claimed++;
      }
    });
    if (claimed > 0) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      setCommitPopupText(`You committed to the ENTIRE DAY — ${claimed} job${claimed > 1 ? "s" : ""}! Your pay is rounded up to the nearest $10.`);
      setShowCommitPopup(true);
    }
  }
  function handleSendMessage(e) {
    e.preventDefault();
    if (!msgInput.trim() || !employee) return;
    createMessage({ employee_id: employee.id, employee_name: employee.name, sender: "employee", content: msgInput.trim() });
    setMsgInput("");
  }
  async function handleCreatePin(e) {
    e.preventDefault();
    setPinError("");
    if (newPin.length !== 4) { setPinError("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { setPinError("PINs don't match"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPinError("Could not create PIN. Please try again."); return; }
    const sessions = JSON.parse(localStorage.getItem("lawnflow_pin_sessions") || "{}");
    sessions[newPin] = { access_token: session.access_token, refresh_token: session.refresh_token };
    localStorage.setItem("lawnflow_pin_sessions", JSON.stringify(sessions));
    localStorage.setItem("lawnflow_my_pin", newPin);
    if (employee) {
      try { await base44.entities.Employee.update(employee.id, { pin: newPin }); } catch (e) { console.error("Failed to save PIN to employee record:", e); }
    }
    setShowPinSetup(false); setNewPin(""); setConfirmPin("");
  }
  function handleLogout() { base44.auth.logout(window.location.href); }

  if (loading || jobsLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (initError) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
        <p className="text-sm text-destructive mb-4 text-center max-w-xs">{initError}</p>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-2 rounded-lg bg-muted text-sm">Back</button>
          <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign In</button>
        </div>
      </div>
    );
  }
  if (showPinSetup) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 safe-top-bottom">
        <div className="w-full max-w-xs">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 neon-border">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Create Your PIN</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">Next time, sign in faster with a 4-digit PIN</p>
          </div>
          <form onSubmit={handleCreatePin} className="space-y-3">
            <input type="password" inputMode="numeric" autoFocus value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Enter PIN" maxLength={4} className="w-full text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border border-border bg-card px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Confirm PIN" maxLength={4} className="w-full text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border border-border bg-card px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {pinError && <p className="text-center text-xs text-destructive">{pinError}</p>}
            <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors touch-target">Create PIN</button>
            <button type="button" onClick={() => setShowPinSetup(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">Skip for now</button>
          </form>
        </div>
      </div>
    );
  }

  const isAdminViewing = !!employeeId;

  const tabs = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "jobs", label: "Jobs", icon: Briefcase },
    { key: "chat", label: "Chat", icon: MessageCircle },
    { key: "rewards", label: "Rewards", icon: Gift },
    { key: "finished", label: "Finished", icon: Camera },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col safe-top-bottom">
      <div className="sticky top-0 z-10 bg-background/95 glass border-b border-border shrink-0">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /> Back</button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{employee?.name}</span>
            {isAdminViewing && <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">ADMIN VIEW</span>}
            {onSwitchToAdmin && !isAdminViewing && (
              <button onClick={onSwitchToAdmin} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Switch to Admin"><Shield className="w-4 h-4" /></button>
            )}
            <button onClick={() => setShowMessages(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground relative">
              <MessageCircle className="w-4 h-4" />
              {myMessages.filter((m) => m.sender === "admin").length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
            {!isAdminViewing && <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></button>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full pb-20">
        {activeTab === "home" && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Employee Portal</h1>
                <p className="text-xs text-muted-foreground">Available jobs & your schedule</p>
              </div>
              {(() => {
                const role = ROLE_CONFIG[employee?.role] || ROLE_CONFIG.greenhorn;
                const nextRole = PROMOTION_PATH[employee?.role];
                return (
                  <div className={`px-3 py-1.5 rounded-xl ${role.bg} flex items-center gap-1.5`}>
                    <Award className={`w-4 h-4 ${role.color}`} />
                    <div>
                      <span className={`text-xs font-bold ${role.color}`}>{role.label}</span>
                      {nextRole && <p className="text-[8px] text-muted-foreground">Next: {ROLE_CONFIG[nextRole]?.label}</p>}
                    </div>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const todayPayout = mine.filter((j) => j.scheduled_date === todayStr).reduce((s, j) => s + getJobPayout(j), 0);
              const weekPayout = mine.filter((j) => weekDays.includes(j.scheduled_date)).reduce((s, j) => s + getJobPayout(j), 0);
              return (
                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 mb-4 neon-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Pay</p>
                      <p className="text-3xl font-bold text-primary neon-text">{formatCurrency(todayPayout)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">This Week</p>
                      <p className="text-3xl font-bold text-emerald-400">{formatCurrency(weekPayout)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Based on your claimed jobs · Solo 65% · Helping 40%</p>
                </div>
              );
            })()}

            {myAnnouncements.length > 0 && (
              <div className="space-y-2 mb-4">
                {myAnnouncements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-bold text-primary mb-1">📢 {a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <a href="tel:3252324474" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Phone className="w-4 h-4" /> Call Joe
              </a>
              <a href="sms:3252324474" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors">
                <MessageCircle className="w-4 h-4" /> Text Joe
              </a>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Reliability</p>
                <p className={`text-lg font-bold ${empScore >= 80 ? "text-emerald-400" : empScore >= 50 ? "text-amber-400" : "text-red-400"}`}>{empScore}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Jobs</p>
                <p className="text-lg font-bold text-primary">{myJobsDone}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Earned</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(myEarnings)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-0.5"><Flame className="w-2.5 h-2.5" /> Streak</p>
                <p className={`text-lg font-bold ${streak > 0 ? "text-orange-400" : "text-muted-foreground"}`}>{streak}</p>
              </div>
            </div>

            <div className="mb-4">
              <RewardProgressBar progress={rewardProgress} goal={rewardGoal} rewardName={targetReward?.name} rewardDescription={targetReward?.description} />
              {(employee?.rewards_claimed ?? 0) > 0 && <p className="text-[10px] text-muted-foreground text-center mt-1.5">🎁 {employee.rewards_claimed} reward{employee.rewards_claimed > 1 ? "s" : ""} claimed</p>}
            </div>

            {currentTier !== "good" && (
              <div className={`rounded-xl border p-3 mb-4 ${currentTier === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${currentTier === "warning" ? "text-amber-400" : "text-red-400"}`}>
                  <AlertTriangle className="w-3 h-3" /> {currentTier === "warning" ? "Warning — Reduced Pay" : "Probation — Jobs Locked"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentTier === "warning" ? `Your reliability is ${empScore}. Pay is reduced ~15%. Complete jobs to recover above 80 for full pay.` : `Your reliability is ${empScore}. You can't claim new jobs. Complete your assigned jobs to earn +5 reliability each and unlock claiming at 50.`}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-3 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Week's Schedule</p>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((date) => {
                  const dayJobs = mine.filter((j) => j.scheduled_date === date && j.status !== "cancelled");
                  const dayTotal = dayJobs.reduce((s, j) => s + getJobPayout(j), 0);
                  const isToday = date === todayStr;
                  return (
                    <div key={date} className={`rounded-lg p-1.5 text-center ${dayJobs.length > 0 ? "bg-primary/10" : "bg-muted/30"} ${isToday ? "ring-1 ring-primary" : ""}`}>
                      <p className="text-[9px] font-bold text-muted-foreground">{weekDayNames[new Date(date + "T00:00:00").getDay()].slice(0, 2)}</p>
                      {dayJobs.length > 0 ? (<><p className="text-xs font-bold text-primary mt-0.5">{dayJobs.length}</p><p className="text-[8px] text-muted-foreground">${dayTotal.toFixed(0)}</p></>) : (<p className="text-xs text-muted-foreground/30 mt-0.5">—</p>)}
                    </div>
                  );
                })}
              </div>
            </div>

            {mine.filter((j) => j.scheduled_date >= todayStr && j.status !== "cancelled").length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upcoming Jobs</p>
                <div className="space-y-2">
                  {mine.filter((j) => j.scheduled_date >= todayStr && j.status !== "cancelled").map((job) => (
                    <div key={job.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.customer_name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDateShort(job.scheduled_date)} · {formatDayOfWeek(job.scheduled_date)}{job.customer_address ? ` · ${job.customer_address}` : ""}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{formatCurrency(getJobPayout(job))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
              <p className="text-xs font-bold text-orange-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Commitment Policy</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only claim jobs you can commit to. If you need to cancel, message me at <a href="tel:3252324474" className="font-bold text-primary underline">(325) 232-4474</a> BEFORE the day of the job. Last-minute cancellations or no-shows will lower your reliability score and reduce your chances of being hired for future work.
              </p>
            </div>

            {!isAdminViewing && (
              <div className="mt-4 rounded-xl border border-border overflow-hidden">
                <PushEnableButton employeeId={employee?.id} />
              </div>
            )}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="p-4">
            <div className="flex gap-1.5 mb-4 p-1 rounded-xl bg-muted/40">
              {[
                { key: "available", label: `Available (${available.length})` },
                { key: "mine", label: `My Jobs (${mine.length})` },
                { key: "taken", label: `Taken (${taken.length})` },
              ].map((s) => (
                <button key={s.key} onClick={() => setJobsSub(s.key)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors select-none ${jobsSub === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>
              ))}
            </div>

            {jobsSub === "available" && (
              available.length > 0 ? (
                <div className="space-y-4">
                  {availableByDate.map((group) => (
                    <div key={group.date}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-xs font-bold text-primary">{formatDateShort(group.date)}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDayOfWeek(group.date)}</span>
                        <div className="flex-1 h-px bg-border" />
                        <button onClick={() => handleClaimAll(group.jobs)} disabled={onProbation} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${onProbation ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>Claim All ({group.jobs.length})</button>
                      </div>
                      <div className="space-y-2">
                        {group.jobs.map((job) => (<JobCard key={job.id} job={job} onClaim={handleClaim} employeeRole={employee?.role} onProbation={onProbation} soloRate={currentSoloRate} helpingRate={currentHelpingRate} />))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No jobs available right now.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back later for new assignments.</p>
                </div>
              )
            )}

            {jobsSub === "mine" && (
              mine.length > 0 ? (
                <div className="space-y-4">
                  {mineByDate.map((group) => {
                    const { total, allClaimed } = getDayTotal(group.date, group.jobs);
                    return (
                      <div key={group.date}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="text-xs font-bold text-primary">{formatDateShort(group.date)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDayOfWeek(group.date)}</span>
                          {allClaimed && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">FULL DAY ✓</span>}
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs font-bold text-primary">{formatCurrency(total)}</span>
                        </div>
                        <div className="space-y-2">
                          {group.jobs.map((job) => (<JobCard key={job.id} job={job} isMine onRelease={handleRelease} onStart={handleStartJob} onComplete={handleCompleteJob} soloRate={currentSoloRate} helpingRate={currentHelpingRate} />))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">You haven't claimed any jobs yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check Available to sign up.</p>
                </div>
              )
            )}

            {jobsSub === "taken" && (
              taken.length > 0 ? (
                <div className="space-y-2">
                  {taken.map((job) => (<JobCard key={job.id} job={job} isTaken />))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <User className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No jobs claimed by others.</p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h1 className="text-lg font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Team Chat</h1>
              <p className="text-xs text-muted-foreground">Talk with your crew and admin</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <EmployeeChat currentUser={{ id: employee?.id, name: employee?.name, isAdmin: false, role: employee?.role }} employees={allEmployees} jobs={allJobs} badges={allBadges} assignments={allAssignments} />
            </div>
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="p-4">
            <h1 className="text-lg font-bold mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-primary" /> Rewards & Achievements</h1>
            <div className="mb-6">
              <RewardProgressBar progress={rewardProgress} goal={rewardGoal} rewardName={targetReward?.name} rewardDescription={targetReward?.description} />
              {targetReward && (
                <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-bold text-primary mb-1">🎁 Current Reward Target</p>
                  <p className="text-sm font-semibold">{targetReward.name}</p>
                  {targetReward.description && <p className="text-xs text-muted-foreground mt-0.5">{targetReward.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5">Complete {rewardGoal} jobs to unlock this reward!</p>
                </div>
              )}
              {(employee?.rewards_claimed ?? 0) > 0 && <p className="text-[11px] text-muted-foreground text-center mt-2">🎉 {employee.rewards_claimed} reward{employee.rewards_claimed > 1 ? "s" : ""} claimed so far!</p>}
            </div>

          </div>
        )}

        {activeTab === "finished" && (
          <FinishedProductTab
            employee={employee}
            todayJobs={allJobs.filter((j) => (j.claimed_by_employee_id === employee?.id || j.exclusive_to_employee_id === employee?.id) && j.scheduled_date === todayStr && j.status !== "cancelled")}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-10 bg-background/95 glass border-t border-border shrink-0 safe-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors select-none ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showKudos && employee?.kudos_message && (
        <KudosPopup kudos={{ title: employee.kudos_title, message: employee.kudos_message, from: employee.kudos_from || "Joe's Mows" }} onClose={() => setShowKudos(false)} />
      )}

      {showCommitPopup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/50 animate-in fade-in duration-200" onClick={() => setShowCommitPopup(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm text-center neon-border animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-primary" /></div>
            <p className="text-lg font-bold mb-2">You're Booked! 🎉</p>
            <p className="text-xs text-muted-foreground mb-3">{commitPopupText}</p>
            <p className="text-[10px] text-orange-400 bg-orange-500/10 rounded-lg p-2 mb-4">Need to cancel? Text <a href="tel:3252324474" className="font-bold text-primary underline">(325) 232-4474</a> BEFORE the day of the job.</p>
            <button onClick={() => setShowCommitPopup(false)} className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Got It</button>
          </div>
        </div>
      )}

      {showMessages && (
        <div className="fixed inset-0 z-[110] bg-background flex flex-col safe-top-bottom">
          <div className="sticky top-0 z-10 bg-background/95 glass border-b border-border">
            <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
              <button onClick={() => setShowMessages(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /> Back</button>
              <span className="text-sm font-semibold">Message Admin</span>
              <div className="w-12" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-2">
            {myMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-8">No messages yet. Send a message to your admin below.</p>
            ) : (
              myMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "employee" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${msg.sender === "employee" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{msg.content}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-background border-t border-border p-3 max-w-lg mx-auto w-full flex gap-2 safe-bottom">
            <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Type a message..." className="flex-1 h-10 rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <button type="submit" className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      )}
    </div>
  );
}