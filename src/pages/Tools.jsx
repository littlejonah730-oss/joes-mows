import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState } from "@/components/ui/shared";
import PresetTextLibrary from "@/components/tools/PresetTextLibrary";
import StrengthTagEditor from "@/components/tools/StrengthTagEditor";
import YardGallery from "@/components/tools/YardGallery";
import CustomerGrouping from "@/components/tools/CustomerGrouping";
import NeighborhoodGrowth from "@/components/tools/NeighborhoodGrowth";
import PriceCalculator from "@/components/tools/PriceCalculator";
import RetentionWatch from "@/components/tools/RetentionWatch";
import ProfitMargin from "@/components/tools/ProfitMargin";
import StaffingRatio from "@/components/tools/StaffingRatio";
import SavingsPlanner from "@/components/tools/SavingsPlanner";
import TaxExport from "@/components/tools/TaxExport";
import { MessageSquare, Tag, Image, DollarSign, TrendingUp, Calculator, UserCheck, PieChart, Users, PiggyBank, FileSpreadsheet } from "lucide-react";

const TABS = [
  { key: "presets", label: "Preset Texts", icon: MessageSquare },
  { key: "value", label: "Value Groups", icon: DollarSign },
  { key: "retention", label: "Retention", icon: UserCheck },
  { key: "profit", label: "Profit Margin", icon: PieChart },
  { key: "pricing", label: "Price Calc", icon: Calculator },
  { key: "tags", label: "Strength Tags", icon: Tag },
  { key: "gallery", label: "Yard Gallery", icon: Image },
  { key: "growth", label: "Growth", icon: TrendingUp },
  { key: "staffing", label: "Staffing", icon: Users },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "tax", label: "Tax Export", icon: FileSpreadsheet },
];

export default function Tools() {
  const [activeTab, setActiveTab] = useState("presets");
  const { data: customers = [], isLoading: cLoading } = useEntityCollection("Customer");
  const { data: employees = [], isLoading: eLoading } = useEntityCollection("Employee");
  const { data: jobs = [], isLoading: jLoading } = useEntityCollection("Job");
  const { data: invoices = [] } = useEntityCollection("Invoice");
  const { data: expenses = [] } = useEntityCollection("Expense");

  if (cLoading || eLoading || jLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Tools" subtitle="Utilities to streamline your lawn care business" />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all select-none ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground neon-glow"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 lg:p-5">
        {activeTab === "presets" && <PresetTextLibrary customers={customers} />}
        {activeTab === "value" && <CustomerGrouping customers={customers} jobs={jobs} />}
        {activeTab === "retention" && <RetentionWatch customers={customers} jobs={jobs} />}
        {activeTab === "profit" && <ProfitMargin invoices={invoices} expenses={expenses} />}
        {activeTab === "pricing" && <PriceCalculator customers={customers} jobs={jobs} />}
        {activeTab === "tags" && <StrengthTagEditor employees={employees} />}
        {activeTab === "gallery" && <YardGallery customers={customers} />}
        {activeTab === "growth" && <NeighborhoodGrowth customers={customers} jobs={jobs} />}
        {activeTab === "staffing" && <StaffingRatio customers={customers} employees={employees} />}
        {activeTab === "savings" && <SavingsPlanner jobs={jobs} expenses={expenses} />}
        {activeTab === "tax" && <TaxExport />}
      </div>
    </div>
  );
}