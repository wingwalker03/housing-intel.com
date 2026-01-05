import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, DollarSign, Percent } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: "currency" | "percent";
  className?: string;
  isLoading?: boolean;
}

export function StatCard({ 
  title, 
  value, 
  trend, 
  trendLabel = "from last month", 
  icon = "currency",
  className,
  isLoading
}: StatCardProps) {
  
  const isPositive = trend && trend > 0;
  
  if (isLoading) {
    return (
      <div className={cn("bg-card rounded-xl p-6 border border-border shadow-sm animate-pulse", className)}>
        <div className="h-4 w-1/3 bg-muted rounded mb-4" />
        <div className="h-8 w-2/3 bg-muted rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">{title}</h3>
        <div className={cn(
          "p-2 rounded-lg",
          icon === "currency" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
        )}>
          {icon === "currency" ? <DollarSign className="w-4 h-4" /> : <Percent className="w-4 h-4" />}
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold font-display tracking-tight text-foreground">{value}</span>
      </div>
      
      {trend !== undefined && (
        <div className="mt-3 flex items-center text-sm">
          <span className={cn(
            "flex items-center font-medium px-2 py-0.5 rounded-full text-xs",
            isPositive 
              ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" 
              : "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </span>
          <span className="ml-2 text-muted-foreground text-xs">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
