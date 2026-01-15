import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SentimentBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  sentiment: string | null;
  sentimentScore?: number | null;
  sentimentSummary?: string | null;
  showScore?: boolean;
  size?: "sm" | "default";
}

export function SentimentBadge({ 
  sentiment, 
  sentimentScore, 
  sentimentSummary,
  showScore = false,
  size = "default",
  ...rest
}: SentimentBadgeProps) {
  if (!sentiment) return null;

  const getSentimentColor = (s: string) => {
    switch (s) {
      case "bullish":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "bearish":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getSentimentIcon = (s: string) => {
    const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
    switch (s) {
      case "bullish":
        return <TrendingUp className={iconSize} />;
      case "bearish":
        return <TrendingDown className={iconSize} />;
      default:
        return <Minus className={iconSize} />;
    }
  };

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "";
    const sign = score >= 0 ? "+" : "";
    return `${sign}${(score * 100).toFixed(0)}`;
  };

  const badge = (
    <Badge 
      variant="outline"
      className={`${getSentimentColor(sentiment)} gap-1 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
      data-testid={`badge-sentiment-${sentiment}`}
    >
      {getSentimentIcon(sentiment)}
      <span className="capitalize">{sentiment}</span>
      {showScore && sentimentScore !== null && sentimentScore !== undefined && (
        <span className="opacity-75 text-xs ml-0.5">
          ({formatScore(sentimentScore)})
        </span>
      )}
    </Badge>
  );

  if (sentimentSummary) {
    return (
      <span {...rest}>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{sentimentSummary}</p>
          </TooltipContent>
        </Tooltip>
      </span>
    );
  }

  return <span {...rest}>{badge}</span>;
}
