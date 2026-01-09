import { useState, useMemo } from "react";
import { useHousingStats, useStates, useMetroStats, useMetrosByState } from "@/hooks/use-housing";
import DrillDownMap from "@/components/maps/drill-down-map";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Map, Info, Maximize2, ArrowLeft, MapPin } from "lucide-react";
import { format, subYears, isSameMonth } from "date-fns";

export default function Dashboard() {
  const [selectedStateCode, setSelectedStateCode] = useState<string | undefined>(undefined);
  const [selectedStateName, setSelectedStateName] = useState<string | undefined>(undefined);
  const [selectedMetroName, setSelectedMetroName] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<'medianHomeValue' | 'yoyChange'>('medianHomeValue');
  const [timeRange, setTimeRange] = useState<'5y' | '10y' | '20y' | 'all'>('all');
  const [movingAverages, setMovingAverages] = useState({
    ma12: false,
    ma24: false,
    ma60: false
  });

  const startDate = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case '5y': return format(subYears(now, 5), 'yyyy-MM-dd');
      case '10y': return format(subYears(now, 10), 'yyyy-MM-dd');
      case '20y': return format(subYears(now, 20), 'yyyy-MM-dd');
      case 'all': return undefined;
    }
  }, [timeRange]);

  const { data: stateStats = [], isLoading: stateStatsLoading } = useHousingStats({
    stateCode: selectedStateCode,
    startDate: undefined,
  });

  const { data: metroStats = [], isLoading: metroStatsLoading } = useMetroStats({
    stateCode: selectedStateCode,
    metroName: selectedMetroName,
  });

  const { data: states = [] } = useStates();
  const { data: metros = [] } = useMetrosByState(selectedStateCode);

  const isMetroMode = !!selectedMetroName;
  const stats = isMetroMode ? metroStats : stateStats;
  const statsLoading = isMetroMode ? metroStatsLoading : stateStatsLoading;

  const handleStateSelect = (code: string | undefined, name: string | undefined) => {
    setSelectedStateCode(code);
    setSelectedStateName(name);
    setSelectedMetroName(undefined);
  };

  const handleDropdownSelect = (code: string) => {
    if (code === "all") {
      handleStateSelect(undefined, undefined);
    } else {
      const state = states.find(s => s.code === code);
      handleStateSelect(code, state?.name);
    }
  };

  const handleMetroSelect = (metroName: string) => {
    if (metroName === "state") {
      setSelectedMetroName(undefined);
    } else {
      setSelectedMetroName(metroName);
    }
  };

  const handleBackToState = () => {
    setSelectedMetroName(undefined);
  };

  const handleResetAll = () => {
    setSelectedStateCode(undefined);
    setSelectedStateName(undefined);
    setSelectedMetroName(undefined);
  };

  const latestStat = stats.length > 0 ? stats[stats.length - 1] : null;
  
  const stat12mAgo = useMemo(() => {
    if (!latestStat || stats.length < 13) return null;
    const targetDate = subYears(new Date(latestStat.date), 1);
    return stats.find(s => isSameMonth(new Date(s.date), targetDate)) || null;
  }, [latestStat, stats]);

  const valueYoY = useMemo(() => {
    if (latestStat && stat12mAgo) {
      return ((latestStat.medianHomeValue - stat12mAgo.medianHomeValue) / stat12mAgo.medianHomeValue) * 100;
    }
    return 0;
  }, [latestStat, stat12mAgo]);

  const historicalHigh = useMemo(() => {
    if (stats.length === 0) return 0;
    return Math.max(...stats.map(s => s.medianHomeValue));
  }, [stats]);

  const diffFromHigh = useMemo(() => {
    if (!latestStat || historicalHigh === 0) return 0;
    return ((latestStat.medianHomeValue - historicalHigh) / historicalHigh) * 100;
  }, [latestStat, historicalHigh]);

  const displayTitle = useMemo(() => {
    if (selectedMetroName) return selectedMetroName;
    if (selectedStateName) return selectedStateName;
    return "National Market Overview";
  }, [selectedMetroName, selectedStateName]);

  const displaySubtitle = useMemo(() => {
    if (selectedMetroName) return `Metro Area in ${selectedStateName}`;
    if (selectedStateName) return "State Overview";
    return "Analyzing historical housing value and growth trends.";
  }, [selectedMetroName, selectedStateName]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 dark">
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
              <span>Data updated Jan 2026</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {(selectedStateCode || selectedMetroName) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedMetroName ? handleBackToState : handleResetAll}
                  className="h-8 gap-1.5"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {selectedMetroName ? "Back to State" : "Back to National"}
                </Button>
              )}
            </div>
            <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
              {displayTitle}
            </h2>
            <p className="text-muted-foreground">
              {displaySubtitle}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            title="Current Median Value"
            value={latestStat ? `$${latestStat.medianHomeValue.toLocaleString()}` : "---"}
            trend={valueYoY}
            trendLabel="vs 12 months ago"
            icon="currency"
            isLoading={statsLoading}
            className="border-primary/20 bg-primary/5 shadow-sm"
          />
          <StatCard 
            title="YoY % Growth"
            value={latestStat ? `${valueYoY.toFixed(2)}%` : "---"}
            trend={latestStat?.yoyChange || 0}
            trendLabel="current rate"
            icon="percent"
            isLoading={statsLoading}
          />
          <StatCard 
            title="Historical High"
            value={latestStat ? `$${historicalHigh.toLocaleString()}` : "---"}
            trend={diffFromHigh}
            trendLabel="from all-time high"
            icon="percent"
            isLoading={statsLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[650px]">
          
          <div className="lg:col-span-7 h-[450px] lg:h-full flex flex-col space-y-4">
            <div className="flex flex-col bg-card/50 p-4 rounded-xl border border-border/60 gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  Geographic Selection
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select 
                    value={selectedStateCode || "all"} 
                    onValueChange={handleDropdownSelect}
                  >
                    <SelectTrigger className="w-[180px] h-8 bg-background border-border shadow-sm" data-testid="select-state">
                      <Map className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
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
                  
                  {selectedStateCode && metros.length > 0 && (
                    <Select 
                      value={selectedMetroName || "state"} 
                      onValueChange={handleMetroSelect}
                    >
                      <SelectTrigger className="w-[200px] h-8 bg-background border-border shadow-sm" data-testid="select-metro">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select Metro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="state">State Overview</SelectItem>
                        <Separator className="my-1" />
                        {metros.map(metro => (
                          <SelectItem key={metro.name} value={metro.name}>
                            {metro.name.replace(/, [A-Z]{2}$/, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-2">
                        <Maximize2 className="w-4 h-4" />
                        Expand
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-6">
                      <DialogHeader className="mb-4">
                        <DialogTitle>Geographic Selection</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 min-h-0 bg-muted/20 rounded-lg overflow-hidden">
                        <DrillDownMap 
                          selectedStateCode={selectedStateCode}
                          selectedStateName={selectedStateName}
                          selectedMetroName={selectedMetroName}
                          metros={metros}
                          onStateSelect={handleStateSelect}
                          onMetroSelect={(name) => setSelectedMetroName(name)}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DrillDownMap 
                selectedStateCode={selectedStateCode}
                selectedStateName={selectedStateName}
                selectedMetroName={selectedMetroName}
                metros={metros}
                onStateSelect={handleStateSelect}
                onMetroSelect={(name) => setSelectedMetroName(name)}
              />
            </div>
          </div>

          <div className="lg:col-span-5 h-[450px] lg:h-full flex flex-col space-y-4">
            <div className="flex flex-col bg-card/50 p-4 rounded-xl border border-border/60 gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Market Trends
                  {isMetroMode && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Metro</span>
                  )}
                </h3>
                
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[90vw] w-full h-[80vh] flex flex-col p-0">
                      <div className="flex-1 min-h-0">
                        <HousingTrendChart 
                          data={stats} 
                          metric={metric} 
                          selectedStateName={displayTitle}
                          isLoading={statsLoading}
                          movingAverages={movingAverages}
                          startDate={startDate}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Tabs 
                    value={metric} 
                    onValueChange={(v) => setMetric(v as any)}
                    className="w-[160px]"
                  >
                    <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/50">
                      <TabsTrigger value="medianHomeValue" className="text-xs">Price</TabsTrigger>
                      <TabsTrigger value="yoyChange" className="text-xs">Growth</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Range</Label>
                  <Tabs 
                    value={timeRange} 
                    onValueChange={(v) => setTimeRange(v as any)} 
                    className="h-9"
                  >
                    <TabsList className="h-full bg-background border border-border shadow-sm w-full">
                      <TabsTrigger value="5y" className="flex-1 text-xs px-2">5Y</TabsTrigger>
                      <TabsTrigger value="10y" className="flex-1 text-xs px-2">10Y</TabsTrigger>
                      <TabsTrigger value="20y" className="flex-1 text-xs px-2">20Y</TabsTrigger>
                      <TabsTrigger value="all" className="flex-1 text-xs px-2">All</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Moving Averages</Label>
                  <div className="flex items-center gap-3 h-9 px-3 bg-background rounded-md border border-border shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ma12" 
                        checked={movingAverages.ma12} 
                        onCheckedChange={(v) => setMovingAverages(p => ({...p, ma12: !!v}))}
                      />
                      <Label htmlFor="ma12" className="text-xs cursor-pointer">12m</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ma24" 
                        checked={movingAverages.ma24} 
                        onCheckedChange={(v) => setMovingAverages(p => ({...p, ma24: !!v}))}
                      />
                      <Label htmlFor="ma24" className="text-xs cursor-pointer">24m</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ma60" 
                        checked={movingAverages.ma60} 
                        onCheckedChange={(v) => setMovingAverages(p => ({...p, ma60: !!v}))}
                      />
                      <Label htmlFor="ma60" className="text-xs cursor-pointer">5y</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-card/50 p-4 rounded-xl border border-border/60">
              <HousingTrendChart 
                data={stats} 
                metric={metric} 
                selectedStateName={displayTitle}
                isLoading={statsLoading}
                movingAverages={movingAverages}
                startDate={startDate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
