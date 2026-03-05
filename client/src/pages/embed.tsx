import { useState, useMemo, useEffect } from "react";
import DrillDownMap from "@/components/maps/drill-down-map";
import { CountyRentalMap } from "@/components/maps/county-rental-map";
import { HousingTrendChart } from "@/components/charts/housing-trend-chart";
import { STATE_NAME_TO_CODE, STATE_CODE_TO_NAME } from "@/lib/slugs";
import metroPointsData from "@/data/metro_points.json";
import { parse } from "csv-parse/browser/esm";
import { subYears, isSameMonth, format } from "date-fns";

interface MetroPoint {
  id: string;
  lat: number;
  lng: number;
}

const metroPoints: MetroPoint[] = metroPointsData as MetroPoint[];

function metroMatchesState(metroId: string, stateCode: string): boolean {
  const commaIdx = metroId.lastIndexOf(', ');
  if (commaIdx === -1) return false;
  const statePart = metroId.substring(commaIdx + 2).trim();
  const states = statePart.split('-').map(s => s.trim().toUpperCase());
  return states.includes(stateCode.toUpperCase());
}

const DATA_URLS = {
  METRO_CSV_URL: "/data/metro_zhvi_LONG_1767920463349.csv",
  STATE_CSV_URL: "/data/state_zhvi_LONG_copy_paste.csv.csv"
};

export default function EmbedPage() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "both";
  const stateParam = params.get("state") || undefined;
  const metroParam = params.get("metro") || undefined;
  const metricParam = (params.get("metric") as "medianHomeValue" | "yoyChange") || "medianHomeValue";
  const timeRangeParam = (params.get("range") as "5y" | "10y" | "20y" | "all") || "10y";
  const themeParam = params.get("theme") || "dark";

  const stateCode = stateParam ? stateParam.toUpperCase() : undefined;
  const stateName = stateCode ? STATE_CODE_TO_NAME[stateCode] : undefined;

  const [metroCsvData, setMetroCsvData] = useState<any[]>([]);
  const [stateCsvData, setStateCsvData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedMetroName = metroParam || undefined;
  const selectedMetroId = selectedMetroName;

  useEffect(() => {
    if (themeParam === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
    return () => {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    };
  }, [themeParam]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [metroRes, stateRes] = await Promise.all([
          fetch(DATA_URLS.METRO_CSV_URL),
          fetch(DATA_URLS.STATE_CSV_URL)
        ]);

        const [metroCsv, stateCsv] = await Promise.all([
          metroRes.text(),
          stateRes.text()
        ]);

        const parseMetroCsv = (csv: string): Promise<any[]> =>
          new Promise((resolve, reject) => {
            parse(csv, { columns: true, skip_empty_lines: true }, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });

        const parseStateCsv = (csv: string): Promise<any[]> =>
          new Promise((resolve, reject) => {
            parse(csv, {
              columns: ['stateName', 'date', 'value'],
              delimiter: '\t',
              skip_empty_lines: true
            }, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });

        const [metroData, stateData] = await Promise.all([
          parseMetroCsv(metroCsv),
          parseStateCsv(stateCsv)
        ]);

        setMetroCsvData(metroData);
        setStateCsvData(stateData);
      } catch (err) {
        console.error("Embed data loading error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const isMetroMode = !!selectedMetroName;

  const stats = useMemo(() => {
    const rawData = isMetroMode ? metroCsvData : stateCsvData;
    if (!rawData.length) return [];

    let filtered = rawData.map((row: any) => {
      let sName = row.stateName;
      if (sName) sName = sName.trim();
      const sc = row.stateCode || STATE_NAME_TO_CODE[sName] || (row.metro ? row.metro.split(',')[1]?.trim() : "");
      return {
        date: row.date || "",
        medianHomeValue: parseFloat(row.value || row.medianHomeValue || "0"),
        yoyChange: parseFloat(row.yoyChange || "0"),
        stateCode: sc,
        metroName: row.metro || ""
      };
    }).filter((row: any) => row.date);

    for (let i = 12; i < filtered.length; i++) {
      if (filtered[i].yoyChange === 0 && filtered[i - 12].medianHomeValue > 0) {
        filtered[i].yoyChange = ((filtered[i].medianHomeValue - filtered[i - 12].medianHomeValue) / filtered[i - 12].medianHomeValue) * 100;
      }
    }

    if (isMetroMode) {
      filtered = filtered.filter((row: any) => row.metroName === selectedMetroName);
    } else if (stateCode && stateCode !== "US") {
      filtered = filtered.filter((row: any) => row.stateCode === stateCode);
    } else {
      const usData = filtered.filter((row: any) => row.stateCode === "US");
      if (usData.length > 0) {
        filtered = usData;
      } else {
        const dateGroups: Record<string, { sum: number; count: number }> = {};
        filtered.forEach(row => {
          if (row.stateCode !== "US" && row.stateCode !== "") {
            if (!dateGroups[row.date]) dateGroups[row.date] = { sum: 0, count: 0 };
            dateGroups[row.date].sum += row.medianHomeValue;
            dateGroups[row.date].count += 1;
          }
        });
        filtered = Object.entries(dateGroups)
          .map(([date, data]) => ({
            date,
            medianHomeValue: data.sum / data.count,
            yoyChange: 0,
            stateCode: "US",
            metroName: ""
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        for (let i = 12; i < filtered.length; i++) {
          const cVal = filtered[i].medianHomeValue;
          const pVal = filtered[i - 12].medianHomeValue;
          if (pVal > 0) filtered[i].yoyChange = ((cVal - pVal) / pVal) * 100;
        }
      }
    }

    const cutoffDate = "2001-01-01";
    filtered = filtered.filter((row: any) => row.date >= cutoffDate);
    return filtered.sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
  }, [isMetroMode, selectedMetroName, stateCode, metroCsvData, stateCsvData]);

  const metroYoYLookup = useMemo(() => {
    if (metroCsvData.length === 0) return {};
    const lookup: Record<string, number> = {};
    const metroGroups: Record<string, any[]> = {};
    metroCsvData.forEach(row => {
      const name = (row.metro || "").replace(/"/g, '').trim();
      if (!name) return;
      if (!metroGroups[name]) metroGroups[name] = [];
      metroGroups[name].push({ ...row, metro: name });
    });
    Object.entries(metroGroups).forEach(([mName, rows]) => {
      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latest = rows[rows.length - 1];
      const latestVal = parseFloat(latest.value);
      const latestDate = new Date(latest.date);
      const targetDate = subYears(latestDate, 1);
      let prevRow = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        const d = new Date(rows[i].date);
        if (isSameMonth(d, targetDate)) { prevRow = rows[i]; break; }
        if (d < targetDate) { prevRow = rows[i]; break; }
      }
      if (prevRow) {
        const oldVal = parseFloat(prevRow.value);
        if (oldVal > 0) {
          const yoy = ((latestVal / oldVal) - 1) * 100;
          lookup[mName] = yoy;
          lookup[mName.toUpperCase()] = yoy;
        }
      }
    });
    return lookup;
  }, [metroCsvData]);

  const startDate = useMemo(() => {
    const now = new Date();
    switch (timeRangeParam) {
      case '5y': return format(subYears(now, 5), 'yyyy-MM-dd');
      case '10y': return format(subYears(now, 10), 'yyyy-MM-dd');
      case '20y': return format(subYears(now, 20), 'yyyy-MM-dd');
      case 'all': return undefined;
    }
  }, [timeRangeParam]);

  const showMap = view === "map" || view === "both";
  const showChart = view === "chart" || view === "both";
  const showRental = view === "rental";

  const displayName = selectedMetroName || stateName || "United States";

  const latestStat = stats.length > 0 ? stats[stats.length - 1] : null;
  const latestValue = latestStat ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(latestStat.medianHomeValue) : "--";
  const latestYoY = latestStat ? `${latestStat.yoyChange >= 0 ? "+" : ""}${latestStat.yoyChange.toFixed(1)}%` : "--";

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="embed-container">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-background/95 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" data-testid="text-embed-title">{displayName}</span>
          <span className="text-xs text-muted-foreground">Median: {latestValue}</span>
          <span className={`text-xs font-medium ${latestStat && latestStat.yoyChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            YoY: {latestYoY}
          </span>
        </div>
        <a
          href={`https://housing-intel.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          data-testid="link-attribution"
        >
          housing-intel.com
        </a>
      </div>

      <div className={`flex-1 flex ${view === "both" ? "flex-col md:flex-row" : "flex-col"} min-h-0 overflow-hidden`}>
        {showRental && (
          <div className="w-full h-full relative min-h-0">
            <CountyRentalMap 
              onCountySelect={(county) => console.log("Embed county selected:", county)}
            />
          </div>
        )}
        {showMap && (
          <div className={`${view === "both" ? "md:w-1/2 h-1/2 md:h-full" : "w-full h-full"} relative min-h-0`}>
            <DrillDownMap
              selectedStateCode={stateCode}
              selectedStateName={stateName}
              selectedMetroName={selectedMetroName}
              selectedMetroId={selectedMetroId}
              metroYoYLookup={metroYoYLookup}
              onStateSelect={() => {}}
              onMetroSelect={() => {}}
              onReset={() => {}}
            />
          </div>
        )}
        {showChart && (
          <div className={`${view === "both" ? "md:w-1/2 h-1/2 md:h-full border-t md:border-t-0 md:border-l border-border/40" : "w-full h-full"} relative min-h-0 bg-background`}>
            <HousingTrendChart
              data={stats}
              metric={metricParam}
              selectedStateName={displayName}
              isLoading={false}
              startDate={startDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
