import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ChartCard({ title, subtitle, icon: Icon, children, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("rounded-2xl border border-border bg-card p-4 lg:p-5 hover:border-primary/30 transition-colors", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <h3 className="font-semibold text-sm lg:text-base">{title}</h3>
        </div>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </motion.div>
  );
}