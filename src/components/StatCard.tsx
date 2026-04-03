import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/15",
  success: "bg-success/5 border-success/15",
  warning: "bg-warning/5 border-warning/15",
};

const iconBgStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export default function StatCard({ title, value, unit, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md", variantStyles[variant])}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBgStyles[variant])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-heading font-bold text-foreground tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
      </div>
    </div>
  );
}
