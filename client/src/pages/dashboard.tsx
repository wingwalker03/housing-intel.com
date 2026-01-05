import { useState, useMemo } from "react";
import { useHousingStats, useStates } from "@/hooks/use-housing";
import USMap from "@/components/maps/us-map";
import { HousingTrendChart } from "@/components/charts/housing-trend-chart";
import { StatCard } from "@/components/ui/card-stats";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, Map, Info } from "lucide-react";
import { format, subYears } from "date-fns";

export default function Dashboard() {
  const [selectedStateCode, setSelectedStateCode] = useState<string | undefined>(undefined);
  const [selectedStateName, setSelectedStateName] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<'medianHomeValue' | 'yoyChange'>('medianHomeValue');
  const [timeRange, setTimeRange] = useState<'5y' | '10y' | '20y' | 'all'>('10y');

  // Calculate start date based on range
  const startDate = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case '5y': return format(subYears(now, 5), 'yyyy-MM-dd');
      case '10y': return format(subYears(now, 10), 'yyyy-MM-dd');
      case '20y': return format(subYears(now, 20), 'yyyy-MM-dd');
      case 'all': return undefined;
    }
  }, [timeRange]);

  const { data: stats = [], isLoading: statsLoading } = useHousingStats({
    stateCode: selectedStateCode,
    startDate,
  });

  const { data: states = [] } = useStates();

  // Helper to handle map clicks
  const handleStateSelect = (code: string | undefined, name: string | undefined) => {
    setSelectedStateCode(code);
    setSelectedStateName(name);
  };

  // Helper to handle dropdown selection
  const handleDropdownSelect = (code: string) => {
    if (code === "all") {
      handleStateSelect(undefined, undefined);
    } else {
      const state = states.find(s => s.code === code);
      handleStateSelect(code, state?.name);
    }
  };

  // Derive summary stats from the latest data point
  const latestStat = stats.length > 0 ? stats[stats.length - 1] : null;
  const previousStat = stats.length > 1 ? stats[stats.length - 2] : null;
  
  // Calculate raw difference for value
  const valueTrend = latestStat && previousStat 
    ? ((latestStat.medianHomeValue - previousStat.medianHomeValue) / previousStat.medianHomeValue) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight hidden sm:block">
              Housing<span className="text-primary">Intel</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-sm text-muted-foreground mr-2">
              <Info className="w-4 h-4 mr-1.5" />
              <span>Data updated monthly</span>
            </div>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
              {selectedStateName || "National Market Overview"}
            </h2>
            <p className="text-muted-foreground mt-1">
              Analyzing housing market trends across {selectedStateName ? selectedStateName : "the United States"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select 
              value={selectedStateCode || "all"} 
              onValueChange={handleDropdownSelect}
            >
              <SelectTrigger className="w-[180px] h-10 bg-card border-border shadow-sm">
                <Map className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire United States</SelectItem>
                <Separator className="my-1" />
                {states.map(state => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs 
              value={timeRange} 
              onValueChange={(v) => setTimeRange(v as any)} 
              className="h-10"
            >
              <TabsList className="h-full bg-muted/50 border border-border/50">
                <TabsTrigger value="5y" className="text-xs px-3">5Y</TabsTrigger>
                <TabsTrigger value="10y" className="text-xs px-3">10Y</TabsTrigger>
                <TabsTrigger value="20y" className="text-xs px-3">20Y</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Current Median Value"
            value={latestStat ? `$${latestStat.medianHomeValue.toLocaleString()}` : "---"}
            trend={valueTrend}
            trendLabel="vs previous month"
            icon="currency"
            isLoading={statsLoading}
            className="border-primary/20 bg-primary/5" // Highlight the most important metric
          />
          <StatCard 
            title="YoY Growth"
            value={latestStat ? `${latestStat.yoyChange.toFixed(1)}%` : "---"}
            trend={latestStat ? latestStat.yoyChange - (previousStat?.yoyChange || 0) : 0}
            trendLabel="vs previous year"
            icon="percent"
            isLoading={statsLoading}
          />
          <StatCard 
            title="Inventory (Est.)"
            value="842k"
            trend={-2.4}
            trendLabel="vs last month"
            icon="currency" // Using generic icon since we don't have home icon in props yet
            isLoading={false} // Static data for demo
          />
          <StatCard 
            title="Avg. Days on Market"
            value="34"
            trend={12}
            trendLabel="vs last month"
            icon="percent" // Using generic icon
            isLoading={false} // Static data for demo
          />
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[600px]">
          
          {/* Map Section */}
          <div className="lg:col-span-7 h-[400px] lg:h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Geographic Selection
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Click a state to filter
              </span>
            </div>
            <USMap 
              selectedStateCode={selectedStateCode} 
              onStateSelect={handleStateSelect} 
            />
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-5 h-[400px] lg:h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Market Trends
              </h3>
              
              <Tabs 
                value={metric} 
                onValueChange={(v) => setMetric(v as any)}
                className="w-[200px]"
              >
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="medianHomeValue" className="text-xs">Value</TabsTrigger>
                  <TabsTrigger value="yoyChange" className="text-xs">YoY %</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex-1 min-h-0">
              <HousingTrendChart 
                data={stats} 
                metric={metric} 
                selectedStateName={selectedStateName}
                isLoading={statsLoading}
              />
            </div>
          </div>
        </div>

        {/* Additional Insights Section (Placeholder for future features) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-50 pointer-events-none grayscale">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-48 flex items-center justify-center">
            <span className="text-muted-foreground font-medium">Regional Comparisons (Coming Soon)</span>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-48 flex items-center justify-center">
             <span className="text-muted-foreground font-medium">Mortgage Rate Correlation (Coming Soon)</span>
          </div>
           <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-48 flex items-center justify-center">
             <span className="text-muted-foreground font-medium">Price Forecast AI (Coming Soon)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
