import { memo, useState, useEffect, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { parse } from "csv-parse/browser/esm/sync";

const US_COUNTIES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";
const US_STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const LATEST_RENTAL_CSV = "/data/County_zori_latest_month_LONG_geoid.csv";

const DEBUG_RENTAL_MAP = true;

const fipsToAbbr: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
  "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY"
};

const stateZoomConfig: Record<string, { center: [number, number]; zoom: number }> = {
  "AL": { center: [-86.8, 32.8], zoom: 5 },
  "AK": { center: [-153, 64], zoom: 2.5 },
  "AZ": { center: [-111.5, 34.2], zoom: 4.5 },
  "AR": { center: [-92.4, 34.8], zoom: 5.5 },
  "CA": { center: [-119.5, 37], zoom: 4 },
  "CO": { center: [-105.5, 39], zoom: 5 },
  "CT": { center: [-72.7, 41.6], zoom: 12 },
  "DE": { center: [-75.5, 39], zoom: 12 },
  "DC": { center: [-77, 38.9], zoom: 35 },
  "FL": { center: [-82, 28.5], zoom: 4 },
  "GA": { center: [-83.4, 32.7], zoom: 5 },
  "HI": { center: [-157, 20.5], zoom: 6 },
  "ID": { center: [-114.5, 44.5], zoom: 4 },
  "IL": { center: [-89.2, 40], zoom: 4.5 },
  "IN": { center: [-86.2, 39.8], zoom: 5.5 },
  "IA": { center: [-93.5, 42], zoom: 5 },
  "KS": { center: [-98.5, 38.5], zoom: 4.5 },
  "KY": { center: [-85.7, 37.8], zoom: 5.5 },
  "LA": { center: [-91.8, 31], zoom: 5 },
  "ME": { center: [-69, 45.3], zoom: 5 },
  "MD": { center: [-77, 39], zoom: 7 },
  "MA": { center: [-71.8, 42.2], zoom: 8 },
  "MI": { center: [-85, 44.3], zoom: 4 },
  "MN": { center: [-94.5, 46], zoom: 4 },
  "MS": { center: [-89.7, 32.7], zoom: 5 },
  "MO": { center: [-92.5, 38.5], zoom: 4.5 },
  "MT": { center: [-109.5, 47], zoom: 4 },
  "NE": { center: [-100, 41.5], zoom: 4.5 },
  "NV": { center: [-116.5, 39], zoom: 4 },
  "NH": { center: [-71.5, 43.8], zoom: 7 },
  "NJ": { center: [-74.5, 40.1], zoom: 8 },
  "NM": { center: [-106, 34.5], zoom: 4.5 },
  "NY": { center: [-75.5, 43], zoom: 4.5 },
  "NC": { center: [-79.5, 35.5], zoom: 5 },
  "ND": { center: [-100.5, 47.5], zoom: 5 },
  "OH": { center: [-82.7, 40.2], zoom: 5.5 },
  "OK": { center: [-97.5, 35.5], zoom: 5 },
  "OR": { center: [-120.5, 44], zoom: 4.5 },
  "PA": { center: [-77.5, 41], zoom: 5 },
  "RI": { center: [-71.5, 41.7], zoom: 15 },
  "SC": { center: [-81, 33.8], zoom: 6 },
  "SD": { center: [-100, 44.5], zoom: 5 },
  "TN": { center: [-86, 35.8], zoom: 5 },
  "TX": { center: [-99.5, 31.5], zoom: 3.5 },
  "UT": { center: [-111.5, 39.3], zoom: 4.5 },
  "VT": { center: [-72.7, 44], zoom: 7 },
  "VA": { center: [-79.5, 37.5], zoom: 5 },
  "WA": { center: [-120.5, 47.5], zoom: 5 },
  "WV": { center: [-80.5, 38.9], zoom: 6 },
  "WI": { center: [-89.5, 44.5], zoom: 4.5 },
  "WY": { center: [-107.5, 43], zoom: 4.5 }
};

interface CountyRentalMapProps {
  selectedStateCode?: string;
  selectedStateName?: string;
  countyRentalLookup: Record<string, number>;
  onStateSelect: (code: string | undefined, name: string | undefined) => void;
  onCountySelect?: (countyName: string | undefined, stateCode: string | undefined) => void;
  onReset: () => void;
}

function CountyRentalMap({
  selectedStateCode,
  selectedStateName,
  countyRentalLookup,
  onStateSelect,
  onCountySelect,
  onReset,
}: CountyRentalMapProps) {
  const [countiesData, setCountiesData] = useState<any>(null);
  const [statesData, setStatesData] = useState<any>(null);
  const [latestRentalData, setLatestRentalData] = useState<Record<string, { zori: number, date: string }>>({});
  const [hoveredCounty, setHoveredCounty] = useState<{
    name: string;
    state: string;
    zori?: number;
    date?: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(US_COUNTIES_URL).then(r => r.json()),
      fetch(US_STATES_URL).then(r => r.json()),
      fetch(LATEST_RENTAL_CSV + "?v=" + Date.now()).then(r => {
        if (!r.ok) throw new Error("Failed to fetch rental CSV");
        return r.text();
      }).then(csv => {
        try {
          const records = parse(csv, { columns: true, skip_empty_lines: true });
          const lookup: Record<string, { zori: number, date: string }> = {};
          records.forEach((r: any) => {
            const rawGeoid = r.geoid || r.GEOID || r.Geoid;
            if (rawGeoid) {
              const geoid = String(rawGeoid).padStart(5, "0");
              lookup[geoid] = { zori: parseFloat(r.zori || r.ZORI), date: r.date || r.Date };
            }
          });
          if (DEBUG_RENTAL_MAP) {
            console.log("[RentalMap Debug] Records length:", records.length);
            console.log("[RentalMap Debug] First record keys:", Object.keys(records[0] || {}));
            console.log("[RentalMap Debug] Lookup size:", Object.keys(lookup).length);
          }
          return lookup;
        } catch (e) {
          console.error("Failed to parse latest rental CSV:", e);
          return {};
        }
      })
    ]).then(([counties, states, rentalLookup]) => {
      setCountiesData(counties);
      setStatesData(states);
      setLatestRentalData(rentalLookup);

      if (DEBUG_RENTAL_MAP) {
        const features = counties.objects.counties.geometries;
        const matched = features.filter((f: any) => rentalLookup[String(f.id).padStart(5, "0")]);
        console.log(`[RentalMap Debug] Total features: ${features.length}`);
        console.log(`[RentalMap Debug] Matched latest-month rows: ${matched.length}`);
        console.log(`[RentalMap Debug] Sample matched GEOIDs:`, Object.keys(rentalLookup).slice(0, 5));
      }
    }).catch(err => {
      console.error("Initialization error:", err);
    });
  }, []);

  const zoomConfig = selectedStateCode
    ? stateZoomConfig[selectedStateCode] || { center: [-96, 38] as [number, number], zoom: 1 }
    : { center: [-96, 38] as [number, number], zoom: 1 };

  const rentalValues = useMemo(() => {
    const vals = Object.values(latestRentalData).map(v => v.zori).filter(v => v > 0);
    if (vals.length === 0) return { min: 500, max: 3000, median: 1500 };
    vals.sort((a, b) => a - b);
    return {
      min: vals[Math.floor(vals.length * 0.05)],
      max: vals[Math.floor(vals.length * 0.95)],
      median: vals[Math.floor(vals.length * 0.5)],
    };
  }, [latestRentalData]);

  const getCountyColor = (geoid: string) => {
    const data = latestRentalData[geoid.padStart(5, "0")];
    if (!data) return "hsl(var(--muted) / 0.15)";

    const zori = data.zori;
    const { min, max } = rentalValues;
    const range = max - min;
    const normalized = Math.max(0, Math.min(1, (zori - min) / (range || 1)));

    // Green (120) for low rent, Red (0) for high rent
    const hue = 120 - normalized * 120;
    const saturation = 60 + normalized * 20;
    const lightness = 65 - normalized * 25;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const formatPriceK = (price: number) => {
    return `${(price / 1000).toFixed(1)}k`;
  };

  const handleBackToNational = () => {
    onStateSelect(undefined, undefined);
  };

  const isZoomedOut = !selectedStateCode;

  if (!countiesData || !statesData) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/50 rounded-xl border border-border/60">
        <div className="text-muted-foreground">Loading rental map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/50 rounded-xl border border-border/60 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {selectedStateCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToNational}
            className="h-8 gap-1.5 bg-background/80 backdrop-blur border border-border shadow-sm"
            data-testid="button-rental-map-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to US
          </Button>
        )}
        {selectedStateCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 bg-background/80 backdrop-blur border border-border shadow-sm"
            data-testid="button-rental-map-reset"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        )}
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {selectedStateName ? `${selectedStateName} - Median Rental Prices` : "US Median Rental Prices by County"}
          </span>
        </div>
      </div>

      {hoveredCounty && (
        <div
          className="fixed z-[200] bg-popover text-popover-foreground border shadow-lg px-3 py-2 rounded-md pointer-events-none"
          style={{
            left: hoveredCounty.x + 12,
            top: hoveredCounty.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <p className="font-semibold text-sm whitespace-nowrap">
            {hoveredCounty.name}, {hoveredCounty.state}
          </p>
          {hoveredCounty.zori !== undefined ? (
            <div className="flex flex-col">
              <p className="text-xs font-medium text-primary">
                Median Rent: ${Math.round(hoveredCounty.zori).toLocaleString()}/mo
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                as of {hoveredCounty.date}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No data</p>
          )}
        </div>
      )}

      {!selectedStateCode && hoveredState && (
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm">
          <span className="text-sm font-medium">{hoveredState}</span>
          <span className="text-xs text-muted-foreground block">Click to explore counties</span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase font-bold text-muted-foreground block text-center">Median Rent</span>
        <div className="flex flex-row-reverse items-center gap-3">
          <div className="flex flex-col justify-between h-32 text-[10px] text-muted-foreground font-medium py-0.5">
            <span>${formatPriceK(rentalValues.max)}</span>
            <span>${formatPriceK(rentalValues.median)}</span>
            <span>${formatPriceK(rentalValues.min)}</span>
          </div>
          <div className="w-2.5 h-32 rounded-full" style={{
            background: "linear-gradient(to top, hsl(120, 60%, 65%), hsl(60, 70%, 55%), hsl(0, 80%, 40%))"
          }} />
        </div>
      </div>

      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: "100%", height: "100%", maxHeight: "100%" }}
      >
        <ZoomableGroup
          center={zoomConfig.center}
          zoom={zoomConfig.zoom}
          minZoom={1}
          maxZoom={50}
          translateExtent={isZoomedOut ? [[0, 0], [800, 600]] : undefined}
        >
          {selectedStateCode ? (
            <>
              <Geographies geography={countiesData}>
                {({ geographies }: { geographies: any[] }) => (
                  <>
                    {geographies.map((geo: any) => {
                      const fipsId = geo.id.padStart(5, "0");
                      const stateFips = fipsId.substring(0, 2);
                      const stateAbbr = fipsToAbbr[stateFips];
                      const countyName = geo.properties?.name || "";

                      if (stateAbbr !== selectedStateCode) {
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            style={{
                              default: {
                                fill: "hsl(var(--muted) / 0.08)",
                                stroke: "hsl(var(--muted-foreground) / 0.05)",
                                strokeWidth: 0.1,
                                outline: "none",
                                pointerEvents: "none" as const,
                              },
                              hover: {
                                fill: "hsl(var(--muted) / 0.08)",
                                stroke: "hsl(var(--muted-foreground) / 0.05)",
                                strokeWidth: 0.1,
                                outline: "none",
                                pointerEvents: "none" as const,
                              },
                              pressed: {
                                fill: "hsl(var(--muted) / 0.08)",
                                outline: "none",
                                pointerEvents: "none" as const,
                              },
                            }}
                          />
                        );
                      }

                      const fillColor = getCountyColor(fipsId);
                      const rentalInfo = latestRentalData[fipsId];

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => onCountySelect?.(countyName, stateAbbr)}
                          onMouseEnter={(e) => {
                            const evt = e as unknown as React.MouseEvent;
                            setHoveredCounty({
                              name: countyName,
                              state: stateAbbr,
                              zori: rentalInfo?.zori,
                              date: rentalInfo?.date,
                              x: evt.clientX,
                              y: evt.clientY,
                            });
                          }}
                          onMouseMove={(e) => {
                            const evt = e as unknown as React.MouseEvent;
                            setHoveredCounty((prev) =>
                              prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null
                            );
                          }}
                          onMouseLeave={() => setHoveredCounty(null)}
                          style={{
                            default: {
                              fill: fillColor,
                              stroke: "hsl(var(--muted-foreground) / 0.15)",
                              strokeWidth: 0.3,
                              outline: "none",
                              cursor: "pointer",
                            },
                            hover: {
                              fill: fillColor,
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: fillColor,
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Geographies>

              <Geographies geography={statesData}>
                {({ geographies }: { geographies: any[] }) => (
                  <>
                    {geographies.map((geo: any) => {
                      const fips = geo.id;
                      const stateAbbr = fipsToAbbr[fips];
                      const isSelected = stateAbbr === selectedStateCode;

                      return (
                        <Geography
                          key={`state-border-${geo.rsmKey}`}
                          geography={geo}
                          style={{
                            default: {
                              fill: "none",
                              stroke: isSelected
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted-foreground) / 0.1)",
                              strokeWidth: isSelected ? 1.5 : 0.25,
                              outline: "none",
                              pointerEvents: "none" as const,
                            },
                            hover: {
                              fill: "none",
                              stroke: isSelected
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted-foreground) / 0.1)",
                              strokeWidth: isSelected ? 1.5 : 0.25,
                              outline: "none",
                              pointerEvents: "none" as const,
                            },
                            pressed: {
                              fill: "none",
                              outline: "none",
                              pointerEvents: "none" as const,
                            },
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Geographies>
            </>
          ) : (
            <>
              <Geographies geography={countiesData}>
                {({ geographies }: { geographies: any[] }) => (
                  <>
                    {geographies.map((geo: any) => {
                      const fipsId = geo.id.padStart(5, "0");
                      const countyName = geo.properties?.name || "";
                      const fillColor = getCountyColor(fipsId);
                      const stateFips = fipsId.substring(0, 2);
                      const stateAbbr = fipsToAbbr[stateFips] || "";
                      const rentalInfo = latestRentalData[fipsId];

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={(e) => {
                            const evt = e as unknown as React.MouseEvent;
                            setHoveredCounty({
                              name: countyName,
                              state: stateAbbr,
                              zori: rentalInfo?.zori,
                              date: rentalInfo?.date,
                              x: evt.clientX,
                              y: evt.clientY,
                            });
                          }}
                          onMouseMove={(e) => {
                            const evt = e as unknown as React.MouseEvent;
                            setHoveredCounty((prev) =>
                              prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null
                            );
                          }}
                          onMouseLeave={() => setHoveredCounty(null)}
                          style={{
                            default: {
                              fill: fillColor,
                              stroke: "hsl(var(--muted-foreground) / 0.05)",
                              strokeWidth: 0.1,
                              outline: "none",
                            },
                            hover: {
                              fill: fillColor,
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                            pressed: {
                              fill: fillColor,
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Geographies>

              <Geographies geography={statesData}>
                {({ geographies }: { geographies: any[] }) => (
                  <>
                    {geographies.map((geo: any) => {
                      const fips = geo.id;
                      const stateAbbr = fipsToAbbr[fips];
                      const stateName = geo.properties.name;

                      return (
                        <Geography
                          key={`state-overlay-${geo.rsmKey}`}
                          geography={geo}
                          onClick={() => onStateSelect(stateAbbr, stateName)}
                          onMouseEnter={() => setHoveredState(stateName)}
                          onMouseLeave={() => setHoveredState(null)}
                          style={{
                            default: {
                              fill: "transparent",
                              stroke: "hsl(var(--foreground) / 0.2)",
                              strokeWidth: 0.5,
                              outline: "none",
                              cursor: "pointer",
                            },
                            hover: {
                              fill: "hsl(var(--primary) / 0.15)",
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1.5,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: "hsl(var(--primary) / 0.2)",
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Geographies>
            </>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {!selectedStateCode && !hoveredState && (
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
          Click any state to explore county data
        </div>
      )}
    </div>
  );
}

export default memo(CountyRentalMap);
