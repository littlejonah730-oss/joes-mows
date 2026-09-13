import EquipmentUtilization from "@/components/intelligence/EquipmentUtilization";
import { Wrench } from "lucide-react";

export default function Equipment() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center neon-glow">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground">Track and manage your equipment fleet</p>
        </div>
      </div>
      <EquipmentUtilization />
    </div>
  );
}