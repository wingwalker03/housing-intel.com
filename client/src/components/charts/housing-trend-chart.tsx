import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HousingStat } from '@/hooks/use-housing';
import { cn } from '@/lib/utils';

interface HousingTrendChartProps {
  data: HousingStat[];
  metric: 'medianHomeValue' | 'yoyChange';
  selectedStateName?: string;
  isLoading?: boolean;
}

export function HousingTrendChart({ 
  data, 
  metric, 
  selectedStateName,
  isLoading 
}: HousingTrendChartProps) {
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate: new Date(item.date),
      formattedValue: metric === 'medianHomeValue' 
        ? item.medianHomeValue 
        : item.yoyChange
    }));
  }, [data, metric]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border shadow-lg rounded-lg p-3 text-sm z-50">
          <p className="font-semibold text-foreground mb-1">
            {format(new Date(label), "MMM yyyy")}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              {metric === 'medianHomeValue' ? 'Value:' : 'YoY Change:'}
            </span>
            <span className="font-medium font-mono text-foreground">
              {metric === 'medianHomeValue' 
                ? `$${payload[0].value.toLocaleString()}`
                : `${payload[0].value.toFixed(1)}%`
              }
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (metric === 'medianHomeValue') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
      return `$${value}`;
    }
    return `${value}%`;
  };

  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center border-border/60 bg-card/50">
        <div className="text-muted-foreground animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          Loading chart data...
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="h-[400px] flex items-center justify-center border-border/60 bg-card/50">
        <div className="text-muted-foreground flex flex-col items-center">
          <p>No data available for the selected criteria.</p>
        </div>
      </Card>
    );
  }

  const isValueMetric = metric === 'medianHomeValue';
  const color = isValueMetric ? "hsl(var(--primary))" : "hsl(var(--accent))";
  const gradientId = `gradient-${metric}`;

  return (
    <Card className="border-border/60 shadow-sm bg-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              {isValueMetric ? 'Median Home Value' : 'Year-over-Year Change'}
            </CardTitle>
            <CardDescription>
              {selectedStateName ? `Historical trends for ${selectedStateName}` : 'National Average Historical Trends'}
            </CardDescription>
          </div>
          <div className="hidden sm:block">
            {/* Legend or status indicator could go here */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <div className={cn("w-2 h-2 rounded-full", isValueMetric ? "bg-primary" : "bg-accent")} />
              {isValueMetric ? "USD Value" : "Percentage"}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="displayDate" 
                tickFormatter={(date) => format(date, 'yyyy')}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                minTickGap={30}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {/* Add a zero line for YoY change */}
              {!isValueMetric && (
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
              )}
              <Area 
                type="monotone" 
                dataKey="formattedValue" 
                stroke={color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#${gradientId})`} 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
