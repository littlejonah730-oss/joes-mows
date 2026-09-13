import { useState, useEffect, useRef, useMemo } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLE_CONFIG } from "@/lib/lawnCare";
import { hasEmployeeEarnedBadge } from "@/lib/badgeUtils";
import { Send, Users, Hash, MessageCircle, Shield, ChevronLeft, Search } from "lucide-react";

function getEarnedBadgeEmojis(senderId, employees, jobs, badges, assignments) {
  const emp = employees.find((e) => e.id === senderId);
  if (!emp) return [];
  const manual = assignments
    .filter((a) => a.employee_id === senderId)
    .map((a) => badges.find((b) => b.id === a.badge_id))
    .filter(Boolean)
    .map((b) => b.icon)
    .filter(Boolean);
  const auto = badges
    .filter((b) => hasEmployeeEarnedBadge(senderId, b, jobs || [], employees))
    .map((b) => b.icon)
    .filter(Boolean);
  return [...new Set([...manual, ...auto])].slice(0, 5);
}

export default function EmployeeChat({ currentUser, employees = [], jobs = [], badges = [], assignments = [], onClose }) {
  const { data: allMessages = [], createItem } = useEntityCollection("ChatMessage", { sort: "created_date", limit: 1000 });
  const [activeChannel, setActiveChannel] = useState(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Real-time: subscribe to new chat messages
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["ChatMessage"] });
    });
    return unsub;
  }, [queryClient]);

  // Build available channels
  const channels = useMemo(() => {
    const list = [{ type: "crew", id: "crew-all", label: "Crew Chat", icon: Users, subtitle: "All employees" }];

    // Job-specific channels (jobs with at least one claimed employee)
    const claimedJobs = jobs.filter((j) => j.claimed_by_employee_id && j.claimed_by_name);
    claimedJobs.forEach((job) => {
      const isAssigned = currentUser.isAdmin || job.claimed_by_employee_id === currentUser.id;
      if (isAssigned) {
        list.push({
          type: "job",
          id: `job-${job.id}`,
          label: job.customer_name,
          icon: Hash,
          subtitle: `${job.job_type || "Job"} · ${job.claimed_by_name}`,
        });
      }
    });

    // DM channels
    employees.forEach((emp) => {
      if (emp.id === currentUser.id) return;
      if (!currentUser.isAdmin && emp.active === false) return;
      const dmId = currentUser.isAdmin
        ? `dm-admin-${emp.id}`
        : emp.user_id
          ? `dm-admin-${currentUser.id}`
          : `dm-${[currentUser.id, emp.id].sort().join("-")}`;
      const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.greenhorn;
      list.push({
        type: "dm",
        id: dmId,
        label: currentUser.isAdmin ? emp.name : (emp.user_id ? "Admin" : emp.name),
        icon: currentUser.isAdmin ? MessageCircle : (emp.user_id ? Shield : MessageCircle),
        subtitle: currentUser.isAdmin ? role.label : (emp.user_id ? "Admin" : role.label),
        employee: emp,
      });
    });

    return list;
  }, [currentUser, employees, jobs]);

  // Auto-select first channel
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      setActiveChannel(channels[0]);
    }
  }, [channels, activeChannel]);

  // Filter messages for active channel
  const channelMessages = useMemo(() => {
    if (!activeChannel) return [];
    return allMessages
      .filter((m) => m.channel_id === activeChannel.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [allMessages, activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeChannel) return;
    createItem({
      channel_type: activeChannel.type,
      channel_id: activeChannel.id,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.isAdmin ? "admin" : (currentUser.role || ""),
      content: input.trim(),
    });
    setInput("");
  }

  const filteredChannels = channels.filter(
    (c) => !search || c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <h2 className="font-semibold text-sm flex-1">Team Chat</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Channel list */}
        <div className={`flex flex-col border-r border-border ${activeChannel ? "hidden lg:flex w-56" : "flex w-full lg:w-56"} shrink-0`}>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 pl-7 pr-2 rounded-md border border-input bg-transparent text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
            {filteredChannels.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors select-none ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{ch.label}</p>
                    <p className="text-[10px] truncate">{ch.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeChannel ? (
            <>
              <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
                <button onClick={() => setActiveChannel(null)} className="lg:hidden p-1 rounded-lg hover:bg-muted">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{activeChannel.label}</p>
                  <p className="text-[10px] text-muted-foreground">{activeChannel.subtitle}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {channelMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center mt-8">No messages yet. Start the conversation!</p>
                ) : (
                  channelMessages.map((msg) => {
                    const isMine = msg.sender_id === currentUser.id;
                    const senderEmp = employees.find((e) => e.id === msg.sender_id);
                    const roleCfg = msg.sender_role === "admin"
                      ? { label: "Admin", color: "text-primary", bg: "bg-primary/10" }
                      : ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.greenhorn;
                    const badgeEmojis = msg.sender_role === "admin"
                      ? []
                      : getEarnedBadgeEmojis(msg.sender_id, employees, jobs, badges, assignments);
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {!isMine && (
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-[10px] font-bold text-primary">{msg.sender_name}</span>
                              <span className={`text-[8px] px-1 py-0.5 rounded ${roleCfg.bg} ${roleCfg.color} font-medium`}>{roleCfg.label}</span>
                              {badgeEmojis.length > 0 && (
                                <span className="text-[10px]">{badgeEmojis.join(" ")}</span>
                              )}
                            </div>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[8px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-border shrink-0">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button type="submit" className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-xs text-muted-foreground text-center">Select a channel to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}