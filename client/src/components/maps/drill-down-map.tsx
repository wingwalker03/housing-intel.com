import { memo, useState, useEffect, useMemo } from "react";
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  ZoomableGroup,
  Marker
} from "react-simple-maps";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import metroPointsData from "@/data/metro_points.json";

const US_STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface MetroPoint {
  id: string;
  lat: number;
  lng: number;
}

const metroPoints: MetroPoint[] = metroPointsData as MetroPoint[];

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
  "DC": { center: [-77, 38.9], zoom: 40 },
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

function metroMatchesState(metroId: string, stateCode: string): boolean {
  const commaIdx = metroId.lastIndexOf(', ');
  if (commaIdx === -1) return false;
  
  const statePart = metroId.substring(commaIdx + 2).trim();
  const states = statePart.split('-').map(s => s.trim().toUpperCase());
  
  return states.includes(stateCode.toUpperCase());
}

interface MetroDataPoint {
  id: string;
  yoyPct: number;
}

interface DrillDownMapProps {
  selectedStateCode?: string;
  selectedStateName?: string;
  selectedMetroName?: string;
  selectedMetroId?: string;
  metroYoYLookup?: Record<string, number>;
  onStateSelect: (code: string | undefined, name: string | undefined) => void;
  onMetroSelect: (metroName: string | undefined, metroId: string | undefined) => void;
  onReset: () => void;
}

function DrillDownMap({ 
  selectedStateCode, 
  selectedStateName,
  selectedMetroName,
  selectedMetroId,
  metroYoYLookup = {},
  onStateSelect, 
  onMetroSelect,
  onReset
}: DrillDownMapProps) {
  const [statesData, setStatesData] = useState<any>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredMetro, setHoveredMetro] = useState<{ id: string; x: number; y: number; yoy?: number } | null>(null);

  const getMetroColor = (metroId: string) => {
    const yoy = metroYoYLookup[metroId] ?? metroYoYLookup[metroId.toUpperCase()];
    if (yoy === undefined) {
      return "hsl(var(--primary) / 0.7)";
    }
    
    // Legend categories: ≤ -10% = dark red, (-10%, 0%) = red, (0%, +10%) = green, ≥ +10% = dark green.
    // We implement smooth gradients within each range.
    
    if (yoy >= 0) {
      if (yoy >= 10) {
        // Dark green: clamp extreme values to a deep green
        const intensity = Math.min(100, 30 + (yoy - 10) * 2);
        return `hsl(142, 76%, ${Math.max(10, 30 - (yoy - 10) * 0.5)}%)`;
      } else {
        // Green gradient (0% to 10%): 0% is light green, 10% is solid green
        // 0% -> lightness 75%, 10% -> lightness 45%
        const lightness = 75 - (yoy * 3);
        return `hsl(142, 70%, ${lightness}%)`;
      }
    } else {
      const absYoy = Math.abs(yoy);
      if (absYoy >= 10) {
        // Dark red: clamp extreme values to a deep red
        return `hsl(0, 84%, ${Math.max(10, 30 - (absYoy - 10) * 0.5)}%)`;
      } else {
        // Red gradient (0% to -10%): 0% is light red, -10% is solid red
        // 0% -> lightness 75%, 10% -> lightness 45%
        const lightness = 75 - (absYoy * 3);
        return `hsl(0, 80%, ${lightness}%)`;
      }
    }
  };

  const getStrokeColor = (metroId: string) => {
    const fill = getMetroColor(metroId);
    if (fill.startsWith("hsl")) {
      // Brighter version for stroke: increase lightness by 10%
      return fill.replace(/(\d+)%\)/, (match, p1) => `${Math.min(100, parseInt(p1) + 10)}%)`);
    }
    return fill;
  };

  const handleMarkerMouseEnter = (metro: MetroPoint, event: React.MouseEvent) => {
    const yoy = metroYoYLookup[metro.id] ?? metroYoYLookup[metro.id.toUpperCase()];
    console.log(`Hovering metro.id: "${metro.id}", YoY found: ${yoy}`);
    setHoveredMetro({
      id: metro.id,
      x: event.clientX,
      y: event.clientY,
      yoy
    });
  };

  useEffect(() => {
    fetch(US_STATES_URL)
      .then(res => res.json())
      .then(data => setStatesData(data));
  }, []);

  const zoomConfig = selectedStateCode 
    ? stateZoomConfig[selectedStateCode] || { center: [-96, 38] as [number, number], zoom: 1 }
    : { center: [-96, 38] as [number, number], zoom: 1 };

  const filteredMetros = useMemo(() => {
    if (!selectedStateCode) return [];
    return metroPoints.filter(metro => metroMatchesState(metro.id, selectedStateCode));
  }, [selectedStateCode]);

  const isMetroMode = !!selectedStateCode;

  const handleBackToNational = () => {
    onStateSelect(undefined, undefined);
    onMetroSelect(undefined, undefined);
  };

  const handleBackToState = () => {
    onMetroSelect(undefined, undefined);
  };

  const handleMarkerClick = (metro: MetroPoint) => {
    onMetroSelect(metro.id, metro.id);
  };

  const handleMarkerMouseMove = (event: React.MouseEvent) => {
    if (hoveredMetro) {
      setHoveredMetro(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
    }
  };

  const handleMarkerMouseLeave = () => {
    setHoveredMetro(null);
  };

  if (!statesData) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/50 rounded-xl border border-border/60">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/50 rounded-xl border border-border/60 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {selectedMetroName && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToState}
            className="h-8 gap-1.5 bg-background/80 backdrop-blur border border-border shadow-sm"
            data-testid="button-map-back-to-state"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {selectedStateName}
          </Button>
        )}
        {selectedStateCode && !selectedMetroName && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToNational}
            className="h-8 gap-1.5 bg-background/80 backdrop-blur border border-border shadow-sm"
            data-testid="button-map-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to US
          </Button>
        )}
        {(selectedStateCode || selectedMetroName) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 bg-background/80 backdrop-blur border border-border shadow-sm"
            data-testid="button-map-reset"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        )}
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {selectedMetroName || selectedStateName || "United States"}
          </span>
        </div>
      </div>

      {selectedStateCode && !selectedMetroName && filteredMetros.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm max-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground block mb-1">
            {filteredMetros.length} Metro Area{filteredMetros.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            Click markers to view metro data
          </span>
        </div>
      )}

      {hoveredMetro && (
        <div 
          className="fixed z-[200] bg-popover text-popover-foreground border shadow-lg px-3 py-2 rounded-md pointer-events-none"
          style={{ 
            left: hoveredMetro.x + 12, 
            top: hoveredMetro.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <p className="font-semibold text-sm whitespace-nowrap">{hoveredMetro.id}</p>
          {hoveredMetro.yoy !== undefined && (
            <p className={hoveredMetro.yoy >= 0 ? "text-emerald-500 text-xs font-medium" : "text-red-500 text-xs font-medium"}>
              YoY: {hoveredMetro.yoy >= 0 ? '+' : ''}{hoveredMetro.yoy.toFixed(2)}%
            </p>
          )}
          <p className="text-xs text-muted-foreground">Click to view housing data</p>
        </div>
      )}

      {!isMetroMode && hoveredState && (
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm">
          <span className="text-sm font-medium">{hoveredState}</span>
          <span className="text-xs text-muted-foreground block">Click to explore</span>
        </div>
      )}

      {selectedStateCode && !selectedMetroName && (
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">YoY Growth Legend</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 30%)' }} />
              <span className="text-[10px]">≤ -10%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
              <span className="text-[10px]">Decline (-10% to 0%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 70%, 60%)' }} />
              <span className="text-[10px]">Growth (0% to +10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 30%)' }} />
              <span className="text-[10px]">≥ +10%</span>
            </div>
          </div>
        </div>
      )}

      <ComposableMap 
        projection="geoAlbersUsa" 
        style={{ width: "100%", height: "100%", maxHeight: "100%" }}
      >
        <ZoomableGroup
          center={zoomConfig.center}
          zoom={zoomConfig.zoom}
          minZoom={1}
          maxZoom={50}
        >
          <Geographies geography={statesData}>
            {({ geographies }: { geographies: any[] }) => (
              <>
                {geographies.map((geo: any) => {
                  const fips = geo.id;
                  const stateAbbr = fipsToAbbr[fips];
                  const stateName = geo.properties.name;
                  const isSelected = selectedStateCode === stateAbbr;
                  const isOtherState = selectedStateCode && !isSelected;

                  if (isMetroMode) {
                    if (isSelected) {
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: {
                              fill: "hsl(var(--muted) / 0.3)",
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1.5,
                              outline: "none",
                              pointerEvents: "none" as const
                            },
                            hover: {
                              fill: "hsl(var(--muted) / 0.3)",
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1.5,
                              outline: "none",
                              pointerEvents: "none" as const
                            },
                            pressed: {
                              fill: "hsl(var(--muted) / 0.3)",
                              outline: "none",
                              pointerEvents: "none" as const
                            },
                          }}
                        />
                      );
                    }
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: {
                            fill: "hsl(var(--muted) / 0.15)",
                            stroke: "hsl(var(--muted-foreground) / 0.1)",
                            strokeWidth: 0.25,
                            outline: "none",
                            pointerEvents: "none" as const
                          },
                          hover: {
                            fill: "hsl(var(--muted) / 0.15)",
                            stroke: "hsl(var(--muted-foreground) / 0.1)",
                            strokeWidth: 0.25,
                            outline: "none",
                            pointerEvents: "none" as const
                          },
                          pressed: {
                            fill: "hsl(var(--muted) / 0.15)",
                            outline: "none",
                            pointerEvents: "none" as const
                          },
                        }}
                      />
                    );
                  }

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => onStateSelect(stateAbbr, stateName)}
                      onMouseEnter={() => setHoveredState(stateName)}
                      onMouseLeave={() => setHoveredState(null)}
                      style={{
                        default: {
                          fill: "hsl(var(--muted) / 0.8)",
                          stroke: "hsl(var(--muted-foreground) / 0.15)",
                          strokeWidth: 0.25,
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 200ms ease"
                        },
                        hover: {
                          fill: "hsl(var(--primary) / 0.6)",
                          stroke: "hsl(var(--primary))",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer"
                        },
                        pressed: {
                          fill: "hsl(var(--primary))",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })}
              </>
            )}
          </Geographies>

          {isMetroMode && filteredMetros.map((metro) => {
            const isSelectedMetro = selectedMetroId === metro.id;
            const markerSize = isSelectedMetro ? 4 : 2.5;
            const fillColor = getMetroColor(metro.id);
            const strokeColor = isSelectedMetro ? "hsl(var(--background))" : getStrokeColor(metro.id);
            
            return (
              <Marker
                key={metro.id}
                coordinates={[metro.lng, metro.lat]}
                onClick={() => handleMarkerClick(metro)}
                onMouseEnter={(e) => handleMarkerMouseEnter(metro, e as unknown as React.MouseEvent)}
                onMouseMove={(e) => handleMarkerMouseMove(e as unknown as React.MouseEvent)}
                onMouseLeave={handleMarkerMouseLeave}
              >
                <circle
                  r={markerSize}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelectedMetro ? 1 : 0.5}
                  style={{
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    pointerEvents: "auto"
                  }}
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {!selectedStateCode && (
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
          Click any state to explore
        </div>
      )}
    </div>
  );
}

export default memo(DrillDownMap);
