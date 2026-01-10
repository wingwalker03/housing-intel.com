import { memo, useState, useEffect, useMemo } from "react";
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  ZoomableGroup 
} from "react-simple-maps";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getCBSAsByState, getCBSADisplayName, getCBSACentroid, type CBSAFeature } from "@/data/cbsa-utils";

const US_STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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

interface DrillDownMapProps {
  selectedStateCode?: string;
  selectedStateName?: string;
  selectedMetroName?: string;
  selectedMetroId?: string;
  onStateSelect: (code: string | undefined, name: string | undefined) => void;
  onMetroSelect: (metroName: string | undefined, metroId: string | undefined) => void;
  onReset: () => void;
}

function DrillDownMap({ 
  selectedStateCode, 
  selectedStateName,
  selectedMetroName,
  selectedMetroId,
  onStateSelect, 
  onMetroSelect,
  onReset
}: DrillDownMapProps) {
  const [statesData, setStatesData] = useState<any>(null);

  useEffect(() => {
    fetch(US_STATES_URL)
      .then(res => res.json())
      .then(data => setStatesData(data));
  }, []);

  const zoomConfig = selectedStateCode 
    ? stateZoomConfig[selectedStateCode] || { center: [-96, 38] as [number, number], zoom: 1 }
    : { center: [-96, 38] as [number, number], zoom: 1 };

  const cbsaFeatures = useMemo(() => {
    if (!selectedStateCode) return [];
    return getCBSAsByState(selectedStateCode);
  }, [selectedStateCode]);

  const handleBackToNational = () => {
    onStateSelect(undefined, undefined);
    onMetroSelect(undefined, undefined);
  };

  const handleBackToState = () => {
    onMetroSelect(undefined, undefined);
  };

  const handleCBSAClick = (feature: CBSAFeature) => {
    const name = feature.properties.NAME;
    const id = feature.properties.CBSAFP;
    onMetroSelect(name, id);
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
            {selectedMetroName 
              ? getCBSADisplayName({ properties: { NAME: selectedMetroName } } as CBSAFeature)
              : selectedStateName || "United States"}
          </span>
        </div>
      </div>

      {selectedStateCode && !selectedMetroName && cbsaFeatures.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm max-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground block mb-1">
            {cbsaFeatures.length} Metro Area{cbsaFeatures.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            Click regions to view metro data
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
                                ? "hsl(var(--primary) / 0.2)" 
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
                                ? "hsl(var(--primary) / 0.2)" 
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

          {selectedStateCode && cbsaFeatures.map((feature) => {
            const isSelectedMetro = selectedMetroId === feature.properties.CBSAFP;
            const displayName = getCBSADisplayName(feature);
            const centroid = getCBSACentroid(feature);
            
            return (
              <Tooltip key={feature.properties.CBSAFP}>
                <TooltipTrigger asChild>
                  <g>
                    <Geography
                      geography={feature}
                      onClick={() => handleCBSAClick(feature)}
                      style={{
                        default: {
                          fill: isSelectedMetro 
                            ? "hsl(var(--primary) / 0.15)" 
                            : "hsl(var(--primary) / 0.05)",
                          stroke: isSelectedMetro 
                            ? "hsl(var(--primary))" 
                            : "hsl(var(--primary) / 0.3)",
                          strokeWidth: isSelectedMetro ? 1.5 : 0.5,
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 200ms ease"
                        },
                        hover: {
                          fill: isSelectedMetro 
                            ? "hsl(var(--primary) / 0.25)" 
                            : "hsl(var(--primary) / 0.15)",
                          stroke: "hsl(var(--primary))",
                          strokeWidth: 1.5,
                          outline: "none",
                          cursor: "pointer",
                          filter: "brightness(1.1)"
                        },
                        pressed: {
                          fill: "hsl(var(--primary) / 0.3)",
                          outline: "none",
                        },
                      }}
                    />
                    <Marker 
                      coordinates={[centroid.lng, centroid.lat]}
                      onClick={() => handleCBSAClick(feature)}
                    >
                      <circle
                        r={isSelectedMetro ? 6 : 4}
                        fill={isSelectedMetro ? "hsl(var(--primary))" : "hsl(var(--background))"}
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        className="transition-all duration-200 hover:fill-primary/20"
                        style={{ cursor: "pointer" }}
                      />
                    </Marker>
                  </g>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {feature.properties.LSAD === "M1" ? "Metro Area" : "Micro Area"}
                  </p>
                  <p className="text-xs text-muted-foreground">Click to view housing data</p>
                </TooltipContent>
              </Tooltip>
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
