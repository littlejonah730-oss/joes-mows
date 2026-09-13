import { useState, useEffect } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROLE_CONFIG, formatCurrency, getJobEmployeePay, getJobCrewSeconds } from "@/lib/lawnCare";
import EmployeeDetailDialog from "@/components/EmployeeDetailDialog";
import AnnouncementSection from "@/components/AnnouncementSection";
import EmployeeAssignments from "@/components/EmployeeAssignments";
import EmployeeJobsChart from "@/components/EmployeeJobsChart";
import RewardTierManager from "@/components/RewardTierManager";
import { Users, Plus, Calculator, MessageSquare, Send, ChevronLeft, MessageCircle, Heart, ClipboardList, Gift, Wrench, ExternalLink, Star, LayoutDashboard, DollarSign, Camera, BarChart3 } from "lucide-react";
import EmployeeChat from "@/components/EmployeeChat";
import KudosDialog from "@/components/KudosDialog";
import SpectatorManager from "@/components/SpectatorManager";
import EmployeePortal from "@/pages/EmployeePortal";
import PromotionProgress from "@/components/PromotionProgress";
import QuickAnnounce from "@/components/QuickAnnounce";
import CollapsibleSection from "@/components/CollapsibleSection";
import EmployeeDashboardTab from "@/components/EmployeeDashboardTab";
import EmployeePayrollTab from "@/components/EmployeePayrollTab";
import FinishedProductAdmin from "@/components/employee/FinishedProductAdmin";
import EmployeeReportsTab from "@/components/employee/EmployeeReportsTab";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "team", label: "Team", icon: Users },
  { key: "jobs", label: "Jobs", icon: ClipboardList },
  { key: "payroll", label: "Payroll", icon: DollarSign },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "finished", label: "Finished", icon: Camera },
  { key: "engage", label: "Rewards", icon: Gift },
  { key: "tools", label: "Tools", icon: Wrench },
];

export default function EmployeeTracker() {
  const { data: employees = [], isLoading, createItem, updateItem, deleteItem } = useEntityCollection("Employee");
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [tab, setTab] = useState("dashboard");

  const [calcAmount, setCalcAmount] = useState("");
  const [calcSplit, setCalcSplit] = useState("solo");
  const [calcEmp, setCalcEmp] = useState("");

  const { data: allJobs = [], createItem: createJob, updateItem: updateJob } = useEntityCollection("Job");
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: allMessages = [], createItem: createMessage } = useEntityCollection("Message");
  const { data: badges = [] } = useEntityCollection("Badge");
  const { data: badgeAssignments = [] } = useEntityCollection("BadgeAssignment");
  const [msgEmpId, setMsgEmpId] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [showCrewChat, setShowCrewChat] = useState(false);
  const [kudosEmp, setKudosEmp] = useState(null);
  const [viewingEmpId, setViewingEmpId] = useState(null);

  useEffect(() => {
    const now = new Date().toISOString();
    localStorage.setItem("lawnflow_last_msg_seen", now);
    window.dispatchEvent(new CustomEvent("lawnflow-clear-notifications"));
  }, []);

  if (isLoading) return <LoadingState />;

  const activeEmployees = employees.filter((e) => e.active !== false);
  const inactiveLast = (a, b) => (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0);
  const starredEmps = employees.filter((e) => e.starred).sort(inactiveLast);
  const otherEmps = employees.filter((e) => !e.starred).sort(inactiveLast);
  const selectedEmp = employees.find((e) => e.id === selectedEmpId);

  const todayStr = new Date().toISOString().slice(0, 10);

  const soloPct = 65;
  const helperPct = 40;
  const pct = calcSplit === "solo" ? soloPct : helperPct;
  const amount = parseFloat(calcAmount) || 0;
  const empPay = (amount * pct) / 100;
  const ownerTake = amount - empPay;
  const selectedEmpCalc = employees.find((e) => e.id === calcEmp);

  // Estimated employee $/hr (solo vs helping) averaged across all timed completed yards.
  const timedJobs = allJobs.filter((j) => j.status === "completed" && getJobCrewSeconds(j) > 0);
  const soloTimed = timedJobs.filter((j) => j.employee_assignment === "solo" || j.employee_assignment === "urgent");
  const helpingTimed = timedJobs.filter((j) => j.employee_assignment === "helping");
  const soloSec = soloTimed.reduce((s, j) => s + getJobCrewSeconds(j), 0);
  const helpingSec = helpingTimed.reduce((s, j) => s + getJobCrewSeconds(j), 0);
  const avgSoloHourly = soloSec > 0 ? soloTimed.reduce((s, j) => s + getJobEmployeePay(j), 0) / (soloSec / 3600) : null;
  const avgHelpingHourly = helpingSec > 0 ? helpingTimed.reduce((s, j) => s + getJobEmployeePay(j), 0) / (helpingSec / 3600) : null;

  const conversations = employees
    .map((emp) => {
      const msgs = allMessages.filter((m) => m.employee_id === emp.id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      return { employee: emp, messages: msgs, lastMsg: msgs[msgs.length - 1] };
    })
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => {
      if (!a.lastMsg || !b.lastMsg) return 0;
      return new Date(b.lastMsg.created_date) - new Date(a.lastMsg.created_date);
    });

  const activeConv = conversations.find((c) => c.employee.id === msgEmpId);

  function handleReply(e) {
    e.preventDefault();
    if (!replyInput.trim() || !msgEmpId) return;
    const emp = employees.find((e) => e.id === msgEmpId);
    createMessage({
      employee_id: msgEmpId,
      employee_name: emp?.name || "",
      sender: "admin",
      content: replyInput.trim(),
    });
    setReplyInput("");
  }

  const handleSave = (data) => {
    if (editEmp) updateItem({ id: editEmp.id, ...data });
    else createItem(data);
    setShowForm(false);
    setEditEmp(null);
  };

  function handleSendKudos(data) {
    if (!kudosEmp) return;
    updateItem({
      id: kudosEmp.id,
      kudos_message: data.message,
      kudos_title: data.title,
      kudos_from: "Joe's Mows",
      kudos_read: false,
      kudos_date: new Date().toISOString(),
    });
    setKudosEmp(null);
  }

  const renderCard = (emp) => {
    const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.greenhorn;
    const score = emp.reliability_score ?? 100;
    const scoreColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
    const claimedCount = allJobs.filter((j) => j.claimed_by_employee_id === emp.id && j.scheduled_date >= todayStr && j.status !== "cancelled" && j.status !== "completed").length;
    return (
      <div key={emp.id} onClick={() => setSelectedEmpId(emp.id)} className={`rounded-xl border bg-card p-3 hover:border-primary/30 transition-all text-left cursor-pointer relative ${emp.active === false ? "opacity-40 grayscale" : ""} ${emp.starred ? "border-amber-500/50 ring-1 ring-amber-500/30" : "border-border"}`}>
        <button onClick={(e) => { e.stopPropagation(); updateItem({ id: emp.id, starred: !emp.starred }); }} className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors z-10 ${emp.starred ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground hover:text-foreground"}`} title={emp.starred ? "Remove from main crew" : "Add to main crew"}>
          <Star className={`w-3.5 h-3.5 ${emp.starred ? "fill-current" : ""}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setKudosEmp(emp); }} className="absolute top-2 right-10 p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors z-10" title="Send Kudos">
          <Heart className="w-3.5 h-3.5 text-primary" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setViewingEmpId(emp.id); }} className="absolute top-2 right-[72px] p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors z-10" title="Open Employee Portal">
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
        </button>
        <div className="flex items-center gap-2 mb-2 pr-24">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{emp.name}</p>
            <Badge color={role.color} bg={role.bg}>{role.label}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground uppercase">Score</p>
            <p className={`text-sm font-bold ${scoreColor}`}>{score}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground uppercase">Jobs</p>
            <p className="text-sm font-bold text-primary">{emp.yards_completed ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground uppercase">Upcoming</p>
            <p className="text-sm font-bold text-primary">{claimedCount}</p>
          </div>
        </div>
        {emp.reward_goal > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5"><span>Reward</span><span>{emp.reward_progress ?? 0}/{emp.reward_goal}</span></div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((emp.reward_progress ?? 0) / emp.reward_goal) * 100)}%` }} /></div>
          </div>
        )}
        {emp.active === false && <p className="text-[9px] text-red-400 text-center mt-1">Inactive</p>}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${activeEmployees.length} active · 65% solo / 40% helper split`}
        action={<Button onClick={() => { setEditEmp(null); setShowForm(true); }} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-thin pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors select-none ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <EmployeeDashboardTab employees={employees} jobs={allJobs} onUpdate={updateJob} />
      )}

      {/* TEAM TAB */}
      {tab === "team" && (
        <>
          <QuickAnnounce employees={activeEmployees} />

          {/* Estimated employee hourly rate (averaged across all timed yards) */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Estimated Employee Hourly Rate</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-amber-500/10">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Solo (65%)</p>
                <p className="text-2xl font-bold text-amber-400">{avgSoloHourly != null ? `${formatCurrency(avgSoloHourly)}/hr` : "—"}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/10">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Helping (40%)</p>
                <p className="text-2xl font-bold text-primary">{avgHelpingHourly != null ? `${formatCurrency(avgHelpingHourly)}/hr` : "—"}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Averaged across all timed completed yards</p>
          </div>

          {/* Payout Calculator */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Payout Calculator</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <Label className="text-xs mb-1.5 block">Amount Earned</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} placeholder="0" className="pl-7" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Employee</Label>
                <select value={calcEmp} onChange={(e) => setCalcEmp(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">Select employee...</option>
                  {activeEmployees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setCalcSplit("solo")} className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${calcSplit === "solo" ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}>Solo Job (65%)</button>
              <button onClick={() => setCalcSplit("helper")} className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${calcSplit === "helper" ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}>Helper (40%)</button>
            </div>
            {amount > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{selectedEmpCalc ? selectedEmpCalc.name : "Employee"} Gets</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(empPay)}</p>
                  <p className="text-[10px] text-muted-foreground">{pct}% of {formatCurrency(amount)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/10">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">You Keep</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(ownerTake)}</p>
                  <p className="text-[10px] text-muted-foreground">{100 - pct}% of {formatCurrency(amount)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Messages</h2>
            {!activeConv ? (
              <div className="space-y-2">
                {conversations.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p>}
                {conversations.map((c) => (
                  <button key={c.employee.id} onClick={() => setMsgEmpId(c.employee.id)} className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-xs font-bold text-primary">{c.employee.name?.charAt(0)?.toUpperCase()}</span></div>
                      <div>
                        <p className="text-sm font-medium">{c.employee.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.lastMsg?.content}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setMsgEmpId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /> Back</button>
                  <span className="text-sm font-semibold">{activeConv.employee.name}</span>
                  <div className="w-12" />
                </div>
                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto scrollbar-thin">
                  {activeConv.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${msg.sender === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{msg.content}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleReply} className="flex gap-2">
                  <input value={replyInput} onChange={(e) => setReplyInput(e.target.value)} placeholder="Reply..." className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
                  <Button type="submit" size="icon" className="bg-primary text-black hover:bg-primary/90 shrink-0"><Send className="w-4 h-4" /></Button>
                </form>
              </div>
            )}
          </div>

          {/* Employee Grid */}
          {employees.length === 0 ? (
            <EmptyState icon={Users} title="No employees yet" subtitle="Add your team to track payouts" action={<Button onClick={() => setShowForm(true)} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>} />
          ) : (
            <>
              {starredEmps.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-current" /> Main Crew</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{starredEmps.map(renderCard)}</div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{otherEmps.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      {/* JOBS TAB */}
      {tab === "jobs" && (
        <>
          <EmployeeJobsChart employees={employees} jobs={allJobs} />
          <EmployeeAssignments jobs={allJobs} employees={employees} />
        </>
      )}

      {/* PAYROLL TAB */}
      {tab === "payroll" && (
        <EmployeePayrollTab employees={employees} jobs={allJobs} />
      )}

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <EmployeeReportsTab employees={employees} jobs={allJobs} />
      )}

      {/* FINISHED PRODUCT TAB */}
      {tab === "finished" && (
        <FinishedProductAdmin employees={employees} />
      )}

      {/* ENGAGE TAB */}
      {tab === "engage" && (
        <>
          <AnnouncementSection employees={employees} />
          <RewardTierManager employees={employees} />
        </>
      )}

      {/* TOOLS TAB */}
      {tab === "tools" && (
        <>
          <PromotionProgress employees={employees} jobs={allJobs} />
          <CollapsibleSection title="Roles & Responsibilities" icon={Users} className="mb-6" defaultOpen>
            <div className="space-y-2">
              {Object.entries(ROLE_CONFIG).map(([key, role]) => (
                <div key={key} className="flex items-start gap-2">
                  <Badge color={role.color} bg={role.bg}>{role.label}</Badge>
                  <p className="text-xs text-muted-foreground flex-1">{role.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
          <SpectatorManager />
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> Crew Chat</h2>
              <Button variant="outline" size="sm" onClick={() => setShowCrewChat(!showCrewChat)}>{showCrewChat ? "Hide" : "Open Chat"}</Button>
            </div>
            {showCrewChat && (
              <div className="h-[400px] border border-border rounded-lg overflow-hidden">
                <EmployeeChat currentUser={{ id: "admin", name: "Admin", isAdmin: true }} employees={employees} jobs={allJobs} badges={badges} assignments={badgeAssignments} />
              </div>
            )}
          </div>
        </>
      )}

      {selectedEmp && (
        <EmployeeDetailDialog employee={selectedEmp} allJobs={allJobs} customers={customers} onPostJob={createJob} onUpdate={updateItem} onDelete={deleteItem} onEdit={(emp) => { setEditEmp(emp); setShowForm(true); }} onMessage={(empId) => { setTab("team"); setMsgEmpId(empId); }} onClose={() => setSelectedEmpId(null)} />
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && (setShowForm(false), setEditEmp(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editEmp ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
            <EmployeeForm employee={editEmp} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditEmp(null); }} />
          </DialogContent>
        </Dialog>
      )}

      {kudosEmp && (
        <KudosDialog employee={kudosEmp} onClose={() => setKudosEmp(null)} onSend={handleSendKudos} />
      )}

      {viewingEmpId && (
        <EmployeePortal employeeId={viewingEmpId} onBack={() => setViewingEmpId(null)} />
      )}
    </div>
  );
}

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [name, setName] = useState(employee?.name || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [role, setRole] = useState(employee?.role || "greenhorn");
  const [notes, setNotes] = useState(employee?.notes || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), phone: phone.trim(), role, notes: notes.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs mb-1.5 block">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" autoFocus />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Role</Label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          <option value="greenhorn">Greenhorn (entry-level, assist only)</option>
          <option value="groundsman">Groundsman (helper, basic tasks)</option>
          <option value="operator">Operator (can run simple jobs solo)</option>
          <option value="foreman">Foreman (runs full jobs, manages)</option>
          <option value="specialist">Specialist (expert in advanced services)</option>
        </select>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90">{employee ? "Update" : "Add"}</Button>
      </div>
    </form>
  );
}