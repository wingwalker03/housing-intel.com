import { useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { HousingStat } from '@/hooks/use-housing';

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
  movingAverages = { ma12: false, ma24: false, ma60: false },
  startDate // New prop to handle filtering while keeping full data for MA
}: HousingTrendChartProps & { startDate?: string }) {
  
  const processedData = useMemo(() => {
    // 1. Data processing for Moving Averages (using FULL dataset)
    const validFullData = data.filter(item => 
      metric === 'medianHomeValue' 
        ? item.medianHomeValue != null && item.medianHomeValue > 0
        : item.yoyChange != null
    );

    const sortedFullData = [...validFullData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const fullDates = sortedFullData.map(d => d.date);
    const fullValues = sortedFullData.map(d => metric === 'medianHomeValue' ? d.medianHomeValue : d.yoyChange);

    const calculateMA = (period: number) => {
      return fullValues.map((_, index) => {
        if (index < period - 1) return null;
        const slice = fullValues.slice(index - period + 1, index + 1);
        const sum = slice.reduce((acc, curr) => acc + (curr || 0), 0);
        return sum / period;
      });
    };

    const fullMa12 = movingAverages.ma12 ? calculateMA(12) : null;
    const fullMa24 = movingAverages.ma24 ? calculateMA(24) : null;
    const fullMa60 = movingAverages.ma60 ? calculateMA(60) : null;

    // 2. Filter for display (using startDate if provided)
    let displayIndices = sortedFullData.map((_, i) => i);
    if (startDate) {
      const start = new Date(startDate);
      displayIndices = displayIndices.filter(i => new Date(sortedFullData[i].date) >= start);
    }

    const dates = displayIndices.map(i => fullDates[i]);
    const values = displayIndices.map(i => fullValues[i]);
    const ma12 = fullMa12 ? displayIndices.map(i => fullMa12[i]) : null;
    const ma24 = fullMa24 ? displayIndices.map(i => fullMa24[i]) : null;
    const ma60 = fullMa60 ? displayIndices.map(i => fullMa60[i]) : null;

    return {
      dates,
      values,
      ma12,
      ma24,
      ma60,
    };
  }, [data, metric, movingAverages, startDate]);

  const plotRef = useRef<any>(null);

  const handleZoomToFit = () => {
    if (plotRef.current?.el) {
      Plotly.relayout(plotRef.current.el, {
        'xaxis.autorange': true,
        'yaxis.autorange': true
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center border-border/60 bg-card/50">
        <div className="text-muted-foreground animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          Loading chart data...
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center border-border/60 bg-card/50">
        <div className="text-muted-foreground flex flex-col items-center">
          <p>No data available for the selected criteria.</p>
        </div>
      </Card>
    );
  }

  const isValueMetric = metric === 'medianHomeValue';
  const mainColor = isValueMetric ? "#3b82f6" : "#8b5cf6"; // Blue-500 or Violet-500

  const traces: any[] = [
    {
      x: processedData.dates,
      y: processedData.values,
      type: 'scatter',
      mode: 'lines',
      name: isValueMetric ? 'Price' : 'Growth',
      line: {
        color: mainColor,
        width: 2,
        shape: 'linear'
      },
      connectgaps: false,
      hoverinfo: 'text',
      text: processedData.values.map((v, i) => {
        const dateStr = new Date(processedData.dates[i]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const valStr = isValueMetric 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
          : `${v.toFixed(2)}%`;
        return `${dateStr}<br>${valStr}`;
      })
    }
  ];

  if (movingAverages.ma12 && processedData.ma12) {
    traces.push({
      x: processedData.dates,
      y: processedData.ma12,
      type: 'scatter',
      mode: 'lines',
      name: '12m MA',
      line: { color: 'rgba(59, 130, 246, 0.5)', width: 1.5, dash: 'dot' },
      connectgaps: false,
      hoverinfo: 'skip'
    });
  }
  if (movingAverages.ma24 && processedData.ma24) {
    traces.push({
      x: processedData.dates,
      y: processedData.ma24,
      type: 'scatter',
      mode: 'lines',
      name: '24m MA',
      line: { color: 'rgba(139, 92, 246, 0.5)', width: 1.5, dash: 'dot' },
      connectgaps: false,
      hoverinfo: 'skip'
    });
  }
  if (movingAverages.ma60 && processedData.ma60) {
    traces.push({
      x: processedData.dates,
      y: processedData.ma60,
      type: 'scatter',
      mode: 'lines',
      name: '5y MA',
      line: { color: 'rgba(156, 163, 175, 0.5)', width: 1.5, dash: 'dot' },
      connectgaps: false,
      hoverinfo: 'skip'
    });
  }

  return (
    <Card className="border-none shadow-none bg-transparent h-full flex flex-col">
      <CardHeader className="pb-0 pt-2 px-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {isValueMetric ? 'Median Home Value' : 'Year-over-Year Change'}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedStateName ? `${selectedStateName}` : 'National Average'}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleZoomToFit}
            title="Zoom to Fit"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <Plot
          ref={plotRef}
          data={traces}
          layout={ {
            autosize: true,
            margin: { l: 10, r: 60, t: 20, b: 40 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            hovermode: 'x unified',
            dragmode: 'pan',
            xaxis: {
              showgrid: true,
              gridcolor: 'rgba(255, 255, 255, 0.05)',
              zeroline: false,
              tickfont: { color: '#6b7280', size: 10 },
              type: 'date',
              spikethickness: 1,
              spikedash: 'dot',
              spikecolor: '#9ca3af',
              spikemode: 'across',
              autorange: true,
              fixedrange: false,
            },
            yaxis: {
              side: 'right',
              showgrid: true,
              gridcolor: 'rgba(255, 255, 255, 0.05)',
              zeroline: false,
              tickfont: { color: '#6b7280', size: 10 },
              tickformat: isValueMetric ? '$,.0f' : '.2f%',
              autorange: true,
              fixedrange: false,
            },
            onupdate: (figure: any) => {
              // Logic to handle autorange on zoom/pan could go here if needed
            }
          } }
          onRelayout={(eventData: any) => {
            if (plotRef.current?.el && (eventData['xaxis.range[0]'] || eventData['xaxis.range[1]'])) {
              Plotly.relayout(plotRef.current.el, {
                'yaxis.autorange': true
              });
            }
          }}
          config={ {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian'],
            scrollZoom: true
          } }
          style={ { width: '100%', height: '100%' } }
          useResizeHandler={true}
        />
      </CardContent>
    </Card>
  );
}
