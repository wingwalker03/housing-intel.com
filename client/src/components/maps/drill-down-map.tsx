import { memo, useState, useEffect, useMemo } from "react";
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  ZoomableGroup,
  Marker 
} from "react-simple-maps";
import { feature } from "topojson-client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MetroInfo } from "@/hooks/use-housing";
import { metroCoordinates, getStateCentroid } from "@/data/metro-coordinates";

const US_STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const US_COUNTIES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

const fipsToAbbr: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
  "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY"
};

const abbrToFips: Record<string, string> = Object.fromEntries(
  Object.entries(fipsToAbbr).map(([k, v]) => [v, k])
);

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


interface DrillDownMapProps {
  selectedStateCode?: string;
  selectedStateName?: string;
  selectedMetroName?: string;
  metros: MetroInfo[];
  onStateSelect: (code: string | undefined, name: string | undefined) => void;
  onMetroSelect: (metroName: string | undefined) => void;
}

function DrillDownMap({ 
  selectedStateCode, 
  selectedStateName,
  selectedMetroName,
  metros,
  onStateSelect, 
  onMetroSelect 
}: DrillDownMapProps) {
  const [statesData, setStatesData] = useState<any>(null);
  const [countiesData, setCountiesData] = useState<any>(null);

  useEffect(() => {
    fetch(US_STATES_URL)
      .then(res => res.json())
      .then(data => setStatesData(data));
  }, []);

  useEffect(() => {
    if (selectedStateCode) {
      fetch(US_COUNTIES_URL)
        .then(res => res.json())
        .then(data => setCountiesData(data));
    }
  }, [selectedStateCode]);

  const zoomConfig = selectedStateCode 
    ? stateZoomConfig[selectedStateCode] || { center: [-96, 38] as [number, number], zoom: 1 }
    : { center: [-96, 38] as [number, number], zoom: 1 };

  // Calculate proportional marker size based on zoom level
  const markerRadius = useMemo(() => {
    if (!selectedStateCode) return 4;
    const zoom = zoomConfig.zoom;
    // As zoom increases (smaller state), markers should be visually smaller relative to the zoom
    // but still clearly visible. 4 / (zoom/2) provides a good balance.
    return Math.max(0.5, 4 / (zoom * 0.5));
  }, [selectedStateCode, zoomConfig.zoom]);

  const stateCounties = useMemo(() => {
    if (!countiesData || !selectedStateCode) return [];
    const stateFips = abbrToFips[selectedStateCode];
    if (!stateFips) return [];
    
    const countiesGeo = feature(countiesData, countiesData.objects.counties);
    return (countiesGeo as any).features.filter((f: any) => {
      const countyFips = String(f.id).padStart(5, '0');
      return countyFips.startsWith(stateFips);
    });
  }, [countiesData, selectedStateCode]);

  const metroMarkers = useMemo(() => {
    if (!selectedStateCode || metros.length === 0) return [];
    
    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash;
    };
    
    return metros.map((metro, index) => {
      const centroid = metroCoordinates[metro.name];
      if (centroid) {
        return { ...metro, coordinates: [centroid.lng, centroid.lat] as [number, number] };
      }
      const stateCentroid = getStateCentroid(selectedStateCode);
      const hash = hashString(metro.name);
      const angle = (hash % 360) * (Math.PI / 180);
      const radius = 0.3 + (index * 0.15);
      const offsetLng = Math.cos(angle) * radius;
      const offsetLat = Math.sin(angle) * radius;
      return { 
        ...metro, 
        coordinates: [stateCentroid.lng + offsetLng, stateCentroid.lat + offsetLat] as [number, number] 
      };
    });
  }, [metros, selectedStateCode]);

  const handleBackToNational = () => {
    onStateSelect(undefined, undefined);
    onMetroSelect(undefined);
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
        {selectedStateCode && (
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
        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {selectedStateCode ? (selectedMetroName || selectedStateName) : "United States"}
          </span>
        </div>
      </div>

      {selectedStateCode && metros.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm max-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground block mb-1">
            {metros.length} Metro Area{metros.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            Click markers to view metro data
          </span>
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

                  return (
                    <Tooltip key={geo.rsmKey}>
                      <TooltipTrigger asChild>
                        <Geography
                          geography={geo}
                          onClick={() => {
                            if (!selectedStateCode) {
                              onStateSelect(stateAbbr, stateName);
                            }
                          }}
                          style={{
                            default: {
                              fill: isSelected 
                                ? "hsl(var(--primary) / 0.3)" 
                                : isOtherState 
                                  ? "hsl(var(--muted) / 0.2)" 
                                  : "hsl(var(--muted) / 0.8)",
                              stroke: isSelected 
                                ? "hsl(var(--primary))" 
                                : "hsl(var(--muted-foreground) / 0.15)",
                              strokeWidth: isSelected ? 1 : 0.25,
                              outline: "none",
                              transition: "all 350ms ease",
                              cursor: selectedStateCode ? "default" : "pointer"
                            },
                            hover: {
                              fill: isSelected 
                                ? "hsl(var(--primary) / 0.3)" 
                                : isOtherState 
                                  ? "hsl(var(--muted) / 0.2)" 
                                  : "hsl(var(--primary) / 0.6)",
                              stroke: isSelected 
                                ? "hsl(var(--primary))" 
                                : "hsl(var(--background))",
                              strokeWidth: isSelected ? 1.5 : 1,
                              outline: "none",
                              cursor: selectedStateCode ? "default" : "pointer",
                              filter: selectedStateCode ? "none" : "brightness(1.1)"
                            },
                            pressed: {
                              fill: "hsl(var(--primary))",
                              outline: "none",
                            },
                          }}
                        />
                      </TooltipTrigger>
                      {!selectedStateCode && (
                        <TooltipContent>
                          <p className="font-semibold">{stateName}</p>
                          <p className="text-xs text-muted-foreground">Click to explore metro areas</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </>
            )}
          </Geographies>

          {selectedStateCode && stateCounties.length > 0 && (
            <>
              {stateCounties.map((county: any) => (
                <Geography
                  key={county.id}
                  geography={county}
                  style={{
                    default: {
                      fill: "transparent",
                      stroke: "hsl(var(--border) / 0.4)",
                      strokeWidth: 0.3,
                      outline: "none",
                    },
                    hover: {
                      fill: "transparent",
                      stroke: "hsl(var(--border) / 0.4)",
                      strokeWidth: 0.3,
                      outline: "none",
                    },
                    pressed: {
                      fill: "transparent",
                      outline: "none",
                    },
                  }}
                />
              ))}
            </>
          )}

          {selectedStateCode && metroMarkers.map((metro) => (
            <Tooltip key={metro.name}>
              <TooltipTrigger asChild>
                <Marker 
                  coordinates={metro.coordinates}
                  onClick={() => onMetroSelect(metro.name)}
                >
                  <g
                    style={{ cursor: "pointer" }}
                    className="group"
                  >
                    <circle
                      r={selectedMetroName === metro.name ? markerRadius * 1.5 : markerRadius}
                      fill="hsl(var(--background) / 0.8)"
                      stroke={selectedMetroName === metro.name ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      strokeWidth={0.5 / zoomConfig.zoom + 0.15}
                      className="transition-transform group-hover:scale-125"
                      style={{ 
                        filter: "drop-shadow(0 0 0.4px white) drop-shadow(0 0 0.4px white)",
                        opacity: 0.9
                      }}
                    />
                    {selectedMetroName === metro.name && (
                      <circle
                        r={markerRadius * 2.5}
                        fill="none"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={0.3 / zoomConfig.zoom + 0.05}
                        opacity={0.3}
                      />
                    )}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <rect
                        x={-(metro.name.split(',')[0].length * (markerRadius * 0.8)) - (markerRadius)}
                        y={-(markerRadius * 5)}
                        width={(metro.name.split(',')[0].length * (markerRadius * 1.6)) + (markerRadius * 2)}
                        height={markerRadius * 3.5}
                        rx={markerRadius * 0.5}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary) / 0.3)"
                        strokeWidth={0.2 / zoomConfig.zoom + 0.05}
                        className="shadow-md"
                      />
                      <text
                        textAnchor="middle"
                        y={-(markerRadius * 2.5)}
                        className="font-semibold fill-foreground tracking-tight"
                        style={{ fontSize: `${markerRadius * 2}px` }}
                      >
                        {metro.name.split(',')[0]}
                      </text>
                    </g>
                  </g>
                </Marker>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{metro.name.replace(/, [A-Z]{2}$/, '')}</p>
                <p className="text-xs text-muted-foreground">Click to view housing data</p>
              </TooltipContent>
            </Tooltip>
          ))}
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
