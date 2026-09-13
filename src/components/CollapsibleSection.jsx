import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, badge, action, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 select-none min-w-0"
        >
          {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
          <h2 className="font-semibold text-sm truncate">{title}</h2>
          {badge != null && badge > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">{badge}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}