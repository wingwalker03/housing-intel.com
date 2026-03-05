import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import DrillDownMap from "@/components/maps/drill-down-map";
import CountyRentalMap from "@/components/maps/county-rental-map";
import { HousingTrendChart } from "@/components/charts/housing-trend-chart";
import { StatCard } from "@/components/ui/card-stats";
import { SEOContent } from "@/components/seo/seo-content";
import { 
  stateNameToSlug, 
  slugToStateName, 
  metroNameToSlug, 
  slugToMetroName,
  STATE_NAME_TO_CODE as SLUG_STATE_NAME_TO_CODE
} from "@/lib/slugs";
import metroPointsData from "@/data/metro_points.json";
import { parse } from "csv-parse/browser/esm";
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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, TrendingUp, Map, Info, Maximize2, ArrowLeft, MapPin, Calculator, Activity, BarChart3, CheckCircle2, Home, DollarSign, Code2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SentimentBadge } from "@/components/ui/sentiment-badge";
import { useMarketSentiment } from "@/hooks/use-housing";
import { EmbedBuilder } from "@/components/embed-builder";
import { ApiDocumentation } from "@/pages/api-docs";
import { Link } from "wouter";
import { format, subYears, isSameMonth } from "date-fns";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const STATE_NAME_TO_CODE: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL",
  "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
  "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
  "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
  "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "United States": "US"
};

const DATA_URLS = {
  METRO_CSV_URL: "/data/metro_zhvi_LONG_1767920463349.csv", 
  STATE_CSV_URL: "/data/state_zhvi_LONG_copy_paste.csv.csv",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [matchState, paramsState] = useRoute("/state/:stateSlug");
  const [matchMetro, paramsMetro] = useRoute("/metro/:metroSlug");

  const [selectedStateCode, setSelectedStateCode] = useState<string | undefined>(undefined);
  const [selectedStateName, setSelectedStateName] = useState<string | undefined>(undefined);
  const [selectedMetroName, setSelectedMetroName] = useState<string | undefined>(undefined);
  const [selectedMetroId, setSelectedMetroId] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<'medianHomeValue' | 'yoyChange'>('medianHomeValue');
  const [timeRange, setTimeRange] = useState<'5y' | '10y' | '20y' | 'all'>('10y');
  const [movingAverages, setMovingAverages] = useState({
    ma12: false,
    ma24: false,
    ma60: false
  });

  const [metroCsvData, setMetroCsvData] = useState<any[]>([]);
  const [stateCsvData, setStateCsvData] = useState<any[]>([]);
  const [countyZoriData, setCountyZoriData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [routeInitialized, setRouteInitialized] = useState(false);
  const [dataView, setDataView] = useState<'housing' | 'rental'>('housing');

  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Market sentiment
  const sentimentMarketType = selectedMetroName ? "metro" : selectedStateName ? "state" : undefined;
  const sentimentSlug = selectedMetroName 
    ? metroNameToSlug(selectedMetroName)
    : selectedStateName 
      ? stateNameToSlug(selectedStateName)
      : undefined;
  const { data: sentiment } = useMarketSentiment(sentimentMarketType, sentimentSlug);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const utmParams = {
      source: searchParams.get('utm_source'),
      medium: searchParams.get('utm_medium'),
      campaign: searchParams.get('utm_campaign')
    };

    if (utmParams.source || utmParams.medium || utmParams.campaign) {
      sessionStorage.setItem('housing_intel_utm', JSON.stringify(utmParams));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const [metroRes, stateRes, countyLatestRes] = await Promise.all([
          fetch(DATA_URLS.METRO_CSV_URL),
          fetch(DATA_URLS.STATE_CSV_URL),
          fetch("/api/county-rental/latest")
        ]);

        if (!metroRes.ok) throw new Error(`Failed to fetch metro data: ${metroRes.status} ${metroRes.statusText}`);
        if (!stateRes.ok) throw new Error(`Failed to fetch state data: ${stateRes.status} ${stateRes.statusText}`);
        if (!countyLatestRes.ok) throw new Error(`Failed to fetch rental data: ${countyLatestRes.status} ${countyLatestRes.statusText}`);

        const [metroCsv, stateCsv] = await Promise.all([
          metroRes.text(),
          stateRes.text(),
        ]);
        const countyLatestJson = await countyLatestRes.json();

        const parseMetroCsv = (csv: string): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            parse(csv, { columns: true, skip_empty_lines: true }, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
        };

        const parseStateCsv = (csv: string): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            parse(csv, { 
              columns: ['stateName', 'date', 'value'], 
              delimiter: '\t',
              skip_empty_lines: true 
            }, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
        };

        const [metroData, stateData] = await Promise.all([
          parseMetroCsv(metroCsv),
          parseStateCsv(stateCsv),
        ]);

        setMetroCsvData(metroData);
        setStateCsvData(stateData);
        setCountyZoriData(countyLatestJson);
      } catch (err: any) {
        console.error("Data loading error:", err);
        setDataError(err.message || "An unknown error occurred while loading data.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const allMetroNames = useMemo(() => {
    return metroPoints.map(m => m.id);
  }, []);

  useEffect(() => {
    if (isLoadingData || routeInitialized) return;
    
    if (matchMetro && paramsMetro?.metroSlug) {
      const metroName = slugToMetroName(paramsMetro.metroSlug, allMetroNames);
      if (metroName) {
        const commaIdx = metroName.lastIndexOf(', ');
        if (commaIdx !== -1) {
          const statePart = metroName.substring(commaIdx + 2).trim();
          const primaryStateCode = statePart.split('-')[0].trim().toUpperCase();
          const stName = Object.entries(STATE_NAME_TO_CODE).find(([, code]) => code === primaryStateCode)?.[0];
          setSelectedStateCode(primaryStateCode);
          setSelectedStateName(stName);
          setSelectedMetroName(metroName);
          setSelectedMetroId(metroName);
        }
      }
    } else if (matchState && paramsState?.stateSlug) {
      const stName = slugToStateName(paramsState.stateSlug);
      const stCode = SLUG_STATE_NAME_TO_CODE[stName];
      if (stCode) {
        setSelectedStateCode(stCode);
        setSelectedStateName(stName);
      }
    }
    
    setRouteInitialized(true);
  }, [isLoadingData, matchState, matchMetro, paramsState, paramsMetro, allMetroNames, routeInitialized]);

  useEffect(() => {
    if (!routeInitialized) return;

    let title = "US Housing Market Overview - Historical Trends & Forecasts";
    let description = "Analyze historical home values and year-over-year growth across the United States. Interactive map and time-series data for all states and major metros.";

    if (selectedMetroName) {
      title = `${selectedMetroName} Housing Market - Value Appreciation & Growth`;
      description = `Real estate data for ${selectedMetroName}. Track historical appreciation, current median home values, and growth forecasts for the ${selectedMetroName} housing market.`;
    } else if (selectedStateName) {
      title = `${selectedStateName} Housing Market - Trends, Prices & Forecasts`;
      description = `Explore the housing market in ${selectedStateName}. View historical median home values, growth trends, and fastest-growing cities in ${selectedStateName}.`;
    }

    document.title = title;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
  }, [selectedStateName, selectedMetroName, routeInitialized]);

  useEffect(() => {
    if (!routeInitialized) return;
    
    if (selectedMetroName) {
      const slug = metroNameToSlug(selectedMetroName);
      const newPath = `/metro/${slug}`;
      if (window.location.pathname !== newPath) {
        setLocation(newPath, { replace: false });
      }
    } else if (selectedStateName) {
      const slug = stateNameToSlug(selectedStateName);
      const newPath = `/state/${slug}`;
      if (window.location.pathname !== newPath) {
        setLocation(newPath, { replace: false });
      }
    } else {
      if (window.location.pathname !== '/') {
        setLocation('/', { replace: false });
      }
    }
  }, [selectedMetroName, selectedStateName, routeInitialized, setLocation]);

  const startDate = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case '5y': return format(subYears(now, 5), 'yyyy-MM-dd');
      case '10y': return format(subYears(now, 10), 'yyyy-MM-dd');
      case '20y': return format(subYears(now, 20), 'yyyy-MM-dd');
      case 'all': return undefined;
    }
  }, [timeRange]);

  const states = useMemo((): { code: string; name: string }[] => {
    if (!stateCsvData.length) return [];
    const stateSet = new Set<string>();
    stateCsvData.forEach((row: any) => {
      if (row.stateName && row.stateName !== "United States") {
        stateSet.add(row.stateName);
      }
    });
    return Array.from(stateSet)
      .map(name => ({ code: STATE_NAME_TO_CODE[name] || "", name }))
      .filter(s => s.code)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stateCsvData]);

  const filteredMetros = useMemo(() => {
    if (!selectedStateCode) return [];
    return metroPoints.filter(metro => metroMatchesState(metro.id, selectedStateCode));
  }, [selectedStateCode]);

  const isMetroMode = !!selectedMetroName;
  
  const stats = useMemo(() => {
    const rawData = isMetroMode ? metroCsvData : stateCsvData;
    if (!rawData.length) return [];

    let filtered = rawData.map((row: any) => {
      let stateName = row.stateName;
      // Handle potential trailing whitespace or specific US representation
      if (stateName) stateName = stateName.trim();
      
      const stateCode = row.stateCode || STATE_NAME_TO_CODE[stateName] || (row.metro ? row.metro.split(',')[1]?.trim() : "");
      
      return {
        date: row.date || "",
        medianHomeValue: parseFloat(row.value || row.medianHomeValue || "0"),
        yoyChange: parseFloat(row.yoyChange || "0"),
        stateCode,
        metroName: row.metro || ""
      };
    }).filter((row: any) => row.date);

    // Compute YoY changes if they are 0
    for (let i = 12; i < filtered.length; i++) {
      if (filtered[i].yoyChange === 0 && filtered[i-12].medianHomeValue > 0) {
        filtered[i].yoyChange = ((filtered[i].medianHomeValue - filtered[i-12].medianHomeValue) / filtered[i-12].medianHomeValue) * 100;
      }
    }

    if (isMetroMode) {
      filtered = filtered.filter((row: any) => row.metroName === selectedMetroName);
    } else if (selectedStateCode && selectedStateCode !== "US") {
      filtered = filtered.filter((row: any) => row.stateCode === selectedStateCode);
    } else {
      // If no state selected, and no "US" code found, we aggregate all states for the date
      const usData = filtered.filter((row: any) => row.stateCode === "US");
      if (usData.length > 0) {
        filtered = usData;
      } else {
        // Fallback: Aggregate national data by averaging all states per date
        const dateGroups: Record<string, { sum: number, count: number }> = {};
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

        // Calculate YoY change for aggregated US data
        for (let i = 12; i < filtered.length; i++) {
          const currentVal = filtered[i].medianHomeValue;
          const prevVal = filtered[i-12].medianHomeValue;
          if (prevVal > 0) {
            filtered[i].yoyChange = ((currentVal - prevVal) / prevVal) * 100;
          }
        }
      }
    }

    // Filter data to only include dates from January 2000 onwards for a more complete picture
    const cutoffDate = "2000-01-01";
    filtered = filtered.filter((row: any) => row.date >= cutoffDate);

    return filtered.sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
  }, [isMetroMode, selectedMetroName, selectedStateCode, metroCsvData, stateCsvData]);

  const statsLoading = isLoadingData;

  const metroYoYLookup = useMemo(() => {
    if (metroCsvData.length === 0) return {};

    const lookup: Record<string, number> = {};
    const metroGroups: Record<string, any[]> = {};

    metroCsvData.forEach(row => {
      const rawName = row.metro || "";
      const name = rawName.replace(/"/g, '').trim(); 
      if (!name) return;
      if (!metroGroups[name]) metroGroups[name] = [];
      metroGroups[name].push({ ...row, metro: name });
    });

    Object.entries(metroGroups).forEach(([metroName, rows]) => {
      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const latest = rows[rows.length - 1];
      const latestVal = parseFloat(latest.value);
      const latestDate = new Date(latest.date);
      
      const targetDate = subYears(latestDate, 1);
      
      let twelveMonthsAgoRow = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        const d = new Date(rows[i].date);
        if (isSameMonth(d, targetDate)) {
          twelveMonthsAgoRow = rows[i];
          break;
        }
        if (d < targetDate) {
          twelveMonthsAgoRow = rows[i];
          break;
        }
      }

      if (twelveMonthsAgoRow) {
        const oldVal = parseFloat(twelveMonthsAgoRow.value);
        if (oldVal > 0) {
          const yoy = ((latestVal / oldVal) - 1) * 100;
          lookup[metroName] = yoy;
          
          // Debugging name transformation
          const parts = metroName.split(",");
          if (parts.length >= 2) {
             const city = parts[0].trim();
             const states = parts[1].trim();
             const primaryState = states.split("-")[0].trim();
             const simplified = `${city}, ${primaryState}`;
             lookup[simplified] = yoy;
             lookup[simplified.toUpperCase()] = yoy;
          }
          lookup[metroName.toUpperCase()] = yoy;
        }
      }
    });

    console.log("YoY Lookup Keys Sample:", Object.keys(lookup).slice(0, 20));
    return lookup;
  }, [metroCsvData]);

  const countyRentalLookup = useMemo(() => {
    if (countyZoriData.length === 0) return {};
    const lookup: Record<string, number> = {};
    const countyGroups: Record<string, any[]> = {};

    countyZoriData.forEach((row: any) => {
      const normalizedName = (row.normalizedName || row.normalized_name || "").trim();
      const state = (row.stateCode || row.state_code || "").trim();
      if (!normalizedName || !state) return;
      const key = `${normalizedName}_${state}`;
      if (!countyGroups[key]) countyGroups[key] = [];
      countyGroups[key].push(row);
    });

    Object.entries(countyGroups).forEach(([key, rows]) => {
      rows.sort((a: any, b: any) => ((a.date || "").localeCompare(b.date || "")));
      const latest = rows[rows.length - 1];
      const zori = typeof latest.zori === 'number' ? latest.zori : parseFloat(latest.zori);
      if (!isNaN(zori) && zori > 0) {
        lookup[key] = zori;
      }
    });

    return lookup;
  }, [countyZoriData]);

  const [rentalTrendData, setRentalTrendData] = useState<any[]>([]);
  const [rentalTrendLoading, setRentalTrendLoading] = useState(false);

  useEffect(() => {
    if (dataView !== 'rental') return;
    const fetchTrend = async () => {
      setRentalTrendLoading(true);
      try {
        const stateParam = selectedStateCode && selectedStateCode !== "US" ? `?stateCode=${selectedStateCode}` : "";
        const res = await fetch(`/api/county-rental/trend${stateParam}`);
        if (res.ok) {
          const data = await res.json();
          setRentalTrendData(data);
        }
      } catch (err) {
        console.error("Failed to fetch rental trend:", err);
      } finally {
        setRentalTrendLoading(false);
      }
    };
    fetchTrend();
  }, [dataView, selectedStateCode]);

  const rentalStats = useMemo(() => {
    if (rentalTrendData.length === 0 || dataView !== 'rental') return [];

    const filtered = rentalTrendData.map((r: any) => ({
      date: r.date,
      medianHomeValue: r.avgZori,
      yoyChange: 0,
      stateCode: selectedStateCode || "US",
      metroName: "",
    }));

    for (let i = 12; i < filtered.length; i++) {
      const cur = filtered[i].medianHomeValue;
      const prev = filtered[i - 12].medianHomeValue;
      if (prev > 0) {
        filtered[i].yoyChange = ((cur - prev) / prev) * 100;
      }
    }

    return filtered;
  }, [rentalTrendData, dataView, selectedStateCode]);

  const activeStats = useMemo(() => {
    return dataView === 'rental' ? rentalStats : stats;
  }, [dataView, rentalStats, stats]);

  const handleStateSelect = (code: string | undefined, name: string | undefined) => {
    setSelectedStateCode(code);
    setSelectedStateName(name);
    setSelectedMetroName(undefined);
    setSelectedMetroId(undefined);
  };

  const handleDropdownSelect = (code: string) => {
    if (code === "all") {
      handleStateSelect(undefined, undefined);
    } else {
      const state = states.find(s => s.code === code);
      handleStateSelect(code, state?.name);
    }
  };

  const handleMetroSelect = (metroName: string | undefined, metroId: string | undefined) => {
    setSelectedMetroName(metroName);
    setSelectedMetroId(metroId);
  };

  const handleMetroDropdownSelect = (value: string) => {
    if (value === "state") {
      setSelectedMetroName(undefined);
      setSelectedMetroId(undefined);
    } else {
      const metro = filteredMetros.find((m: any) => m.id === value);
      if (metro) {
        setSelectedMetroName(metro.id);
        setSelectedMetroId(metro.id);
      }
    }
  };

  const handleBackToState = () => {
    if (selectedStateName) {
      const slug = stateNameToSlug(selectedStateName);
      setLocation(`/state/${slug}`);
    } else {
      handleResetAll();
    }
    setSelectedMetroName(undefined);
    setSelectedMetroId(undefined);
  };

  const handleResetAll = () => {
    setLocation("/");
    setSelectedStateCode(undefined);
    setSelectedStateName(undefined);
    setSelectedMetroName(undefined);
    setSelectedMetroId(undefined);
  };

  const [buyYear, setBuyYear] = useState<string>("2015");
  const [buyPrice, setBuyPrice] = useState<string>("300000");

  const calculatorResult = useMemo(() => {
    if (!selectedMetroName || !stats.length) return null;

    const currentVal = stats[stats.length - 1].medianHomeValue;
    const yearData = stats.find(s => s.date.startsWith(buyYear));

    if (!yearData) return { error: "No price data available for this year" };

    const priceAtBuy = yearData.medianHomeValue;
    const multiplier = currentVal / priceAtBuy;
    const estimatedValue = parseFloat(buyPrice) * multiplier;

    return {
      value: estimatedValue,
      appreciation: ((estimatedValue - parseFloat(buyPrice)) / parseFloat(buyPrice)) * 100
    };
  }, [selectedMetroName, stats, buyYear, buyPrice]);

  const rankings = useMemo(() => {
    if (isLoadingData) return { top: [], bottom: [] };

    const getLatestYoY = (rows: any[]) => {
      if (!rows.length) return 0;
      const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
      const latest = sorted[0];
      const targetDate = subYears(new Date(latest.date), 1);
      const prev = sorted.find(s => isSameMonth(new Date(s.date), targetDate));
      if (latest.value && prev && prev.value) {
        return ((parseFloat(latest.value) / parseFloat(prev.value)) - 1) * 100;
      }
      return 0;
    };

    let items: { name: string; value: number }[] = [];

    if (!selectedStateCode || selectedStateCode === "US") {
      // National: Group by state
      const stateGroups: Record<string, any[]> = {};
      stateCsvData.forEach(row => {
        if (!stateGroups[row.stateName]) stateGroups[row.stateName] = [];
        stateGroups[row.stateName].push(row);
      });
      items = Object.entries(stateGroups)
        .filter(([name]) => name !== "United States")
        .map(([name, rows]) => ({
          name,
          value: getLatestYoY(rows)
        }));
    } else {
      // State: Group by metro
      const metroGroups: Record<string, any[]> = {};
      metroCsvData.forEach(row => {
        const metroName = row.metro || "";
        if (metroMatchesState(metroName, selectedStateCode)) {
          if (!metroGroups[metroName]) metroGroups[metroName] = [];
          metroGroups[metroName].push(row);
        }
      });
      items = Object.entries(metroGroups).map(([name, rows]) => ({
        name,
        value: getLatestYoY(rows)
      }));
    }

    const sorted = items.sort((a, b) => b.value - a.value);
    const top = sorted.filter(item => item.value > 0).slice(0, 5);
    const bottom = sorted.filter(item => item.value < 0).reverse().slice(0, 5);

    // Pad with blank items if less than 5
    const pad = (list: any[]) => {
      const padded = [...list];
      while (padded.length < 5) {
        padded.push({ name: "", value: null });
      }
      return padded;
    };

    const linkify = (item: any, type: 'state' | 'metro') => {
      if (!item.name) return item;
      const slug = type === 'state' ? stateNameToSlug(item.name) : metroNameToSlug(item.name);
      const url = `/${type}/${slug}`;
      return { ...item, url };
    };

    return {
      top: pad(top).map(item => linkify(item, selectedStateCode && selectedStateCode !== "US" ? 'metro' : 'state')),
      bottom: pad(bottom).map(item => linkify(item, selectedStateCode && selectedStateCode !== "US" ? 'metro' : 'state'))
    };
  }, [isLoadingData, stateCsvData, metroCsvData, selectedStateCode]);

  const seoType = useMemo(() => {
    if (selectedMetroName) return "metro" as const;
    if (selectedStateName) return "state" as const;
    return "national" as const;
  }, [selectedMetroName, selectedStateName]);

  const handleForecastSubmit = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const storedUtm = sessionStorage.getItem('housing_intel_utm');
      const utm = storedUtm ? JSON.parse(storedUtm) : {};

      await apiRequest("POST", "/api/leads", {
        email,
        metroName: selectedMetroName,
        utmSource: utm.source || "direct",
        utmMedium: utm.medium || null,
        utmCampaign: utm.campaign || null
      });
      toast({
        title: "Success!",
        description: "Your forecast is on the way.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayStats = dataView === 'rental' ? rentalStats : stats;
  const latestStat = displayStats.length > 0 ? displayStats[displayStats.length - 1] : null;
  
  const stat12mAgo = useMemo(() => {
    if (!latestStat || displayStats.length < 13) return null;
    const targetDate = subYears(new Date(latestStat.date), 1);
    return displayStats.find(s => isSameMonth(new Date(s.date), targetDate)) || null;
  }, [latestStat, displayStats]);

  const valueYoY = useMemo(() => {
    if (latestStat && stat12mAgo) {
      return ((latestStat.medianHomeValue - stat12mAgo.medianHomeValue) / stat12mAgo.medianHomeValue) * 100;
    }
    return 0;
  }, [latestStat, stat12mAgo]);

  const yoyTrend = useMemo(() => {
    if (!latestStat || !stat12mAgo) return 0;
    return latestStat.yoyChange - stat12mAgo.yoyChange;
  }, [latestStat, stat12mAgo]);

  const historicalHigh = useMemo(() => {
    if (displayStats.length === 0) return 0;
    return Math.max(...displayStats.map(s => s.medianHomeValue));
  }, [displayStats]);

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
      {isLoadingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg font-medium">Loading data...</p>
          </div>
        </div>
      )}

      {dataError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="bg-destructive/10 border border-destructive p-6 rounded-xl max-w-md text-center">
            <h3 className="text-xl font-bold text-destructive mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{dataError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      )}
      
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={handleResetAll}
            data-testid="link-home"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight hidden sm:block">
              Housing<span className="text-primary">Intel</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                  <Code2 className="h-4 w-4" />
                  <span className="hidden sm:inline">API</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <ApiDocumentation />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Embed</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Embed this Visualization</DialogTitle>
                </DialogHeader>
                <EmbedBuilder 
                  stateCode={selectedStateCode} 
                  metroName={selectedMetroName} 
                />
              </DialogContent>
            </Dialog>

            <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

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
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
                {displayTitle}
              </h2>
              {sentiment && (selectedStateName || selectedMetroName) && (
                <SentimentBadge 
                  sentiment={sentiment.sentiment}
                  sentimentScore={sentiment.sentimentScore}
                  sentimentSummary={sentiment.sentimentSummary}
                  showScore
                  data-testid="badge-market-sentiment"
                />
              )}
            </div>
            <p className="text-muted-foreground">
              {displaySubtitle}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            title={dataView === 'rental' ? "Avg Median Rent" : "Current Median Value"}
            value={latestStat ? `$${Math.round(latestStat.medianHomeValue).toLocaleString()}${dataView === 'rental' ? '/mo' : ''}` : "---"}
            trend={valueYoY}
            trendLabel="vs 12 months ago"
            icon="currency"
            isLoading={statsLoading}
            className="border-primary/20 bg-primary/5 shadow-sm"
          />
          <StatCard 
            title="YoY % Growth"
            value={latestStat ? `${valueYoY.toFixed(2)}%` : "---"}
            trend={yoyTrend}
            trendLabel="vs 12 months ago"
            icon="percent"
            isLoading={statsLoading}
          />
          <StatCard 
            title={dataView === 'rental' ? "Historical High Rent" : "Historical High"}
            value={latestStat ? `$${Math.round(historicalHigh).toLocaleString()}${dataView === 'rental' ? '/mo' : ''}` : "---"}
            trend={diffFromHigh}
            trendLabel="from all-time high"
            icon="percent"
            isLoading={statsLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {selectedMetroName ? (
            <Card className="md:col-span-2 bg-card/50 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  Home Value Estimator
                </CardTitle>
                <CardDescription>
                  See what a home bought in {selectedMetroName} would be worth today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="buy-year" className="text-xs">Purchase Year</Label>
                    <Select value={buyYear} onValueChange={setBuyYear}>
                      <SelectTrigger id="buy-year" className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 25 }, (_, i) => 2025 - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buy-price" className="text-xs">Purchase Price ($)</Label>
                    <Input 
                      id="buy-price"
                      type="number"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="h-9 bg-background"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex flex-col justify-center min-h-[60px]">
                    {calculatorResult?.error ? (
                      <span className="text-xs text-rose-500 font-medium leading-tight">
                        {calculatorResult.error}
                      </span>
                    ) : calculatorResult ? (
                      <>
                        <span className="text-[10px] uppercase font-bold text-primary/70 leading-none mb-1">Estimated Value Today</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-primary">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(calculatorResult.value || 0)}
                          </span>
                          <span className={`text-xs font-medium ${(calculatorResult.appreciation || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ({(calculatorResult.appreciation || 0) >= 0 ? '+' : ''}{(calculatorResult.appreciation || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-card/50 border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Top 5 Fastest Growing {selectedStateCode ? "Metros" : "States"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rankings.top.map((item, i) => (
                      <div key={item.name || `blank-top-${i}`} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background/50 border border-border/40 min-h-[38px] group">
                        <span className="font-medium text-muted-foreground w-6">{i + 1}.</span>
                        {item.url ? (
                          <a href={item.url} className="flex-1 truncate pr-4 text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors">
                            {item.name}
                          </a>
                        ) : (
                          <span className="flex-1 truncate pr-4">{item.name}</span>
                        )}
                        <span className="font-bold text-emerald-500">
                          {item.value !== null ? `+${item.value.toFixed(2)}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />
                    Top 5 Declining {selectedStateCode ? "Metros" : "States"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rankings.bottom.map((item, i) => (
                      <div key={item.name || `blank-bottom-${i}`} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background/50 border border-border/40 min-h-[38px] group">
                        <span className="font-medium text-muted-foreground w-6">{i + 1}.</span>
                        {item.url ? (
                          <a href={item.url} className="flex-1 truncate pr-4 text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors">
                            {item.name}
                          </a>
                        ) : (
                          <span className="flex-1 truncate pr-4">{item.name}</span>
                        )}
                        <span className="font-bold text-rose-500">
                          {item.value !== null ? `${item.value.toFixed(2)}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[650px]">
          
          <div className="lg:col-span-7 h-[600px] lg:h-full flex flex-col space-y-4">
            <div className="flex flex-col bg-card/50 p-4 rounded-xl border border-border/60 gap-4 h-full">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  Geographic Selection
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm" data-testid="toggle-data-view">
                    <Home className={`w-3.5 h-3.5 ${dataView === 'housing' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${dataView === 'housing' ? 'text-foreground' : 'text-muted-foreground'}`}>Housing</span>
                    <Switch
                      checked={dataView === 'rental'}
                      onCheckedChange={(checked) => {
                        setDataView(checked ? 'rental' : 'housing');
                        if (checked) {
                          setSelectedMetroName(undefined);
                          setSelectedMetroId(undefined);
                        }
                      }}
                      data-testid="switch-data-view"
                    />
                    <DollarSign className={`w-3.5 h-3.5 ${dataView === 'rental' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${dataView === 'rental' ? 'text-foreground' : 'text-muted-foreground'}`}>Rental</span>
                  </div>

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
                  
                  {dataView === 'housing' && selectedStateCode && filteredMetros.length > 0 && (
                    <Select 
                      value={selectedMetroId || "state"} 
                      onValueChange={handleMetroDropdownSelect}
                    >
                      <SelectTrigger className="w-[200px] h-8 bg-background border-border shadow-sm" data-testid="select-metro">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select Metro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="state">State Overview</SelectItem>
                        <Separator className="my-1" />
                        {filteredMetros.map(metro => (
                          <SelectItem key={metro.id} value={metro.id}>
                            {metro.id}
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
                        <DialogTitle>{dataView === 'rental' ? 'County Rental Prices' : 'Geographic Selection'}</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 min-h-0 bg-muted/20 rounded-lg overflow-hidden">
                        {dataView === 'rental' ? (
                          <CountyRentalMap
                            selectedStateCode={selectedStateCode}
                            selectedStateName={selectedStateName}
                            countyRentalLookup={countyRentalLookup}
                            onStateSelect={handleStateSelect}
                            onReset={handleResetAll}
                          />
                        ) : (
                          <DrillDownMap 
                            selectedStateCode={selectedStateCode}
                            selectedStateName={selectedStateName}
                            selectedMetroName={selectedMetroName}
                            selectedMetroId={selectedMetroId}
                            metroYoYLookup={metroYoYLookup}
                            onStateSelect={handleStateSelect}
                            onMetroSelect={handleMetroSelect}
                            onReset={handleResetAll}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {dataView === 'rental' ? (
                  <CountyRentalMap
                    selectedStateCode={selectedStateCode}
                    selectedStateName={selectedStateName}
                    countyRentalLookup={countyRentalLookup}
                    onStateSelect={handleStateSelect}
                    onReset={handleResetAll}
                  />
                ) : (
                  <DrillDownMap 
                    selectedStateCode={selectedStateCode}
                    selectedStateName={selectedStateName}
                    selectedMetroName={selectedMetroName}
                    selectedMetroId={selectedMetroId}
                    metroYoYLookup={metroYoYLookup}
                    onStateSelect={handleStateSelect}
                    onMetroSelect={handleMetroSelect}
                    onReset={handleResetAll}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 h-[650px] lg:h-full flex flex-col space-y-4">
            <div className="flex flex-col bg-card/50 p-4 rounded-xl border border-border/60 gap-4 flex-1">
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
                        {isMetroMode && statsLoading === false && stats.length === 0 ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                            <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                              Housing data is not available for this metro area.
                            </p>
                          </div>
                        ) : (
                          <HousingTrendChart 
                            data={displayStats} 
                            metric={metric} 
                            selectedStateName={displayTitle}
                            isLoading={statsLoading}
                            movingAverages={movingAverages}
                            startDate={startDate}
                            isRentalData={dataView === 'rental'}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Tabs 
                    value={metric} 
                    onValueChange={(v) => setMetric(v as any)}
                    className="w-[160px]"
                  >
                    <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/50">
                      <TabsTrigger value="medianHomeValue" className="text-xs">{dataView === 'rental' ? 'Rent' : 'Price'}</TabsTrigger>
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

              <div className="flex-1 min-h-0">
                {isMetroMode && statsLoading === false && stats.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Housing data is not available for this metro area. 
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBackToState}
                      className="mt-4"
                      data-testid="button-no-data-back"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to {selectedStateName}
                    </Button>
                  </div>
                ) : (
                  <HousingTrendChart 
                    data={displayStats} 
                    metric={metric} 
                    selectedStateName={displayTitle}
                    isLoading={statsLoading}
                    movingAverages={movingAverages}
                    startDate={startDate}
                    isRentalData={dataView === 'rental'}
                  />
                )}
              </div>
            </div>

            {isMetroMode && !statsLoading && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 shadow-inner shrink-0">
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-base tracking-tight">Detailed 12-Month Forecast</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get exclusive insights on projected housing prices in <span className="text-foreground font-medium">{selectedMetroName}</span> sent directly to your inbox.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="email" 
                        placeholder="Enter your email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
                      />
                    </div>
                    <Button 
                      size="default" 
                      className="h-10 px-6 font-semibold shadow-sm hover:shadow-md transition-all shrink-0"
                      onClick={handleForecastSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Get Forecast"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <section className="mt-12 mb-8" data-testid="section-methodology">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Data Methodology</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-card/30 border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Source
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  Powered by <strong>Zillow ZHVI</strong>, representing typical home values in the 35th-65th percentile.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  YoY Growth
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  Calculated as <code>((P_t - P_t-12) / P_t-12) * 100</code> to remove seasonal fluctuations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5" />
                  Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  Data reflects the latest Zillow release (November 2025). Synchronized monthly, typically around the 15th.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  ZHVI uses a 3-month moving average of closed sales (30-60 day market lag).
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <SEOContent
          type={seoType}
          stateName={selectedStateName}
          stateCode={selectedStateCode}
          metroName={selectedMetroName}
          latestValue={latestStat?.medianHomeValue}
          yoyChange={valueYoY}
          historicalHigh={historicalHigh}
          dataYears={timeRange === '5y' ? 5 : timeRange === '10y' ? 10 : timeRange === '20y' ? 20 : 25}
        />

        {/* Market Directory for SEO Crawlability */}
        <div className="mt-16 pt-8 border-t border-border/40">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Market Directory</h3>
          {!selectedStateCode ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {states.map(state => (
                <a 
                  key={state.code} 
                  href={`/state/${stateNameToSlug(state.name)}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {state.name}
                </a>
              ))}
            </div>
          ) : !selectedMetroName ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMetros.map(metro => (
                <a 
                  key={metro.id} 
                  href={`/metro/${metroNameToSlug(metro.id)}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {metro.id}
                </a>
              ))}
            </div>
          ) : (
            <div className="flex gap-4">
              <a href="/" className="text-sm text-primary hover:underline">National Overview</a>
              <span className="text-muted-foreground">/</span>
              <a href={`/state/${stateNameToSlug(selectedStateName || "")}`} className="text-sm text-primary hover:underline">{selectedStateName}</a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
