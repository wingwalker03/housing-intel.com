import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
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
  movingAverages?: {
    ma12: boolean;
    ma24: boolean;
    ma60: boolean;
  };
}

export function HousingTrendChart({ 
  data, 
  metric, 
  selectedStateName,
  isLoading,
  movingAverages = { ma12: false, ma24: false, ma60: false }
}: HousingTrendChartProps) {
  
  const chartData = useMemo(() => {
    // Filter out items with missing or null values for the primary metric
    const validData = data.filter(item => 
      metric === 'medianHomeValue' 
        ? item.medianHomeValue != null && item.medianHomeValue > 0
        : item.yoyChange != null
    );

    const sortedData = [...validData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sortedData.map((item, index) => {
      const calculateMA = (period: number) => {
        if (index < period - 1) return null;
        const slice = sortedData.slice(index - period + 1, index + 1);
        const sum = slice.reduce((acc, curr) => acc + (metric === 'medianHomeValue' ? curr.medianHomeValue : curr.yoyChange), 0);
        return sum / period;
      };

      return {
        ...item,
        displayDate: new Date(item.date),
        formattedValue: metric === 'medianHomeValue' 
          ? item.medianHomeValue 
          : item.yoyChange,
        ma12: movingAverages.ma12 ? calculateMA(12) : null,
        ma24: movingAverages.ma24 ? calculateMA(24) : null,
        ma60: movingAverages.ma60 ? calculateMA(60) : null,
      };
    });
  }, [data, metric, movingAverages]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border shadow-lg rounded-lg p-3 text-sm z-50">
          <p className="font-semibold text-foreground mb-2 border-b border-border pb-1">
            {format(new Date(label), "MMMM yyyy")}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground whitespace-nowrap">{entry.name}:</span>
                </div>
                <span className="font-medium font-mono text-foreground">
                  {metric === 'medianHomeValue'
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(entry.value)
                    : `${entry.value.toFixed(2)}%`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (metric === 'medianHomeValue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return `${value.toFixed(2)}%`;
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
  const mainColor = isValueMetric ? "hsl(var(--primary))" : "hsl(var(--accent))";

  return (
    <Card className="border-border/60 shadow-sm bg-card h-full overflow-visible">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
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
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }} />
              {!isValueMetric && (
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
              )}
              
              {metric === 'medianHomeValue' && (
                <Line 
                  name="Price"
                  type="monotone" 
                  dataKey="formattedValue" 
                  stroke={mainColor} 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={1000}
                  connectNulls
                />
              )}
              {metric === 'yoyChange' && (
                <Line 
                  name="YoY %"
                  type="monotone" 
                  dataKey="formattedValue" 
                  stroke={mainColor} 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={1000}
                  connectNulls
                />
              )}

              {movingAverages.ma12 && (
                <Line
                  name="12m MA"
                  type="monotone"
                  dataKey="ma12"
                  stroke="hsl(var(--primary) / 0.6)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              {movingAverages.ma24 && (
                <Line
                  name="24m MA"
                  type="monotone"
                  dataKey="ma24"
                  stroke="hsl(var(--accent) / 0.6)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              {movingAverages.ma60 && (
                <Line
                  name="5y MA"
                  type="monotone"
                  dataKey="ma60"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
