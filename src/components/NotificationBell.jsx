import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Calendar, UserCheck, AlertTriangle, Repeat, UserPlus, CalendarClock, Check, X, CheckCheck, Play, CheckCircle2, KeyRound, DollarSign } from "lucide-react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatDateShort } from "@/lib/lawnCare";
import PushEnableButton from "@/components/PushEnableButton";

const READ_KEY = "lawnflow_notifs_read";
const DISMISSED_KEY = "lawnflow_notifs_dismissed";
const MAX_STORED = 400;

function loadSet(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set).slice(-MAX_STORED)));
  } catch {
    /* storage unavailable — read state just won't persist */
  }
}

const NOTIF_TYPES = {
  jobs_today: { icon: Calendar, cls: "text-primary" },
  jobs_tomorrow: { icon: Calendar, cls: "text-sky-400" },
  job_claimed: { icon: UserCheck, cls: "text-primary" },
  job_started: { icon: Play, cls: "text-amber-400" },
  job_completed: { icon: CheckCircle2, cls: "text-emerald-400" },
  overdue_payment: { icon: AlertTriangle, cls: "text-amber-400" },
  recurring_generated: { icon: Repeat, cls: "text-emerald-400" },
  schedule_change: { icon: CalendarClock, cls: "text-sky-400" },
  waitlist_filled: { icon: UserPlus, cls: "text-emerald-400" },
  login_alert: { icon: KeyRound, cls: "text-primary" },
  money_summary: { icon: DollarSign, cls: "text-emerald-400" },
  custom: { icon: Bell, cls: "text-muted-foreground" }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { data: messages = [] } = useEntityCollection("Message", { sort: "-created_date", limit: 100 });
  const { data: notifications = [] } = useEntityCollection("Notification", { sort: "-created_date", limit: 100 });
  const [read, setRead] = useState(() => loadSet(READ_KEY));
  const [dismissed, setDismissed] = useState(() => loadSet(DISMISSED_KEY));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Old "clear notifications" trigger (fired elsewhere in the app)
  useEffect(() => {
    function clearFromOutside() {
      const next = loadSet(DISMISSED_KEY);
      itemsRef.current.forEach((i) => next.add(i.key));
      saveSet(DISMISSED_KEY, next);
      setDismissed(next);
      setOpen(false);
    }
    window.addEventListener("lawnflow-clear-notifications", clearFromOutside);
    return () => window.removeEventListener("lawnflow-clear-notifications", clearFromOutside);
  }, []);

  const employeeMessages = messages.filter((m) => m.sender === "employee");
  const items = [
    ...notifications.map((n) => ({ kind: "notif", key: `notif-${n.id}`, date: n.created_date, type: n.type, title: n.title, body: n.body, link: n.link })),
    ...employeeMessages.map((m) => ({ kind: "msg", key: `msg-${m.id}`, date: m.created_date, title: m.employee_name || "Employee", body: m.content }))
  ]
    .filter((i) => !dismissed.has(i.key))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);
  itemsRef.current = items;

  const unreadCount = items.filter((i) => !read.has(i.key)).length;

  function markRead(key) {
    const next = loadSet(READ_KEY);
    next.add(key);
    saveSet(READ_KEY, next);
    setRead(next);
  }

  function markAllRead() {
    const next = loadSet(READ_KEY);
    itemsRef.current.forEach((i) => next.add(i.key));
    saveSet(READ_KEY, next);
    setRead(next);
  }

  function dismiss(key) {
    const next = loadSet(DISMISSED_KEY);
    next.add(key);
    saveSet(DISMISSED_KEY, next);
    setDismissed(next);
  }

  function dismissAll() {
    const next = loadSet(DISMISSED_KEY);
    itemsRef.current.forEach((i) => next.add(i.key));
    saveSet(DISMISSED_KEY, next);
    setDismissed(next);
    setOpen(false);
  }

  function handleItemClick(item) {
    markRead(item.key);
    setOpen(false);
    navigate(item.kind === "notif" ? item.link || "/" : "/employees");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary select-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors touch-target"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={dismissAll}
                  className="px-2 py-1 -mr-1 text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-colors touch-target"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">All caught up</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {items.map((item) => {
                const unread = !read.has(item.key);
                const style = item.kind === "notif" ? NOTIF_TYPES[item.type] || NOTIF_TYPES.custom : null;
                const ItemIcon = style ? style.icon : MessageSquare;
                const iconCls = style ? style.cls : "text-muted-foreground";
                return (
                  <div key={item.key} className={`relative border-b border-border/50 last:border-b-0 ${unread ? "bg-primary/5" : ""}`}>
                    <button
                      onClick={() => handleItemClick(item)}
                      className="w-full text-left px-3 py-2.5 pr-14 hover:bg-muted/50 transition-colors flex gap-2"
                    >
                      {unread && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      {!unread && <div className="w-2 shrink-0" />}
                      <ItemIcon className={`w-4 h-4 shrink-0 mt-0.5 ${iconCls}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{item.title}</p>
                          <span className="text-[9px] text-muted-foreground shrink-0">{item.date ? formatDateShort(String(item.date).slice(0, 10)) : ""}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.body}</p>
                      </div>
                    </button>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                      {unread && (
                        <button
                          type="button"
                          onClick={() => markRead(item.key)}
                          title="Mark as read"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismiss(item.key)}
                        title="Clear"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <PushEnableButton isAdmin />
        </div>
      )}
    </div>
  );
}