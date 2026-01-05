import React, { memo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantile } from "d3-scale";
import { StateInfo } from "@/hooks/use-housing";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Use a reliable hosted TopoJSON file for US states
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface USMapProps {
  selectedStateCode?: string;
  onStateSelect: (code: string | undefined, name: string | undefined) => void;
  // In a real app, we would pass data to color the map choropleth style
  // For this version, we focus on selection
}

// Map FIPS codes to state abbreviations for matching
const fipsToAbbr: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
  "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY"
};

const USMap = ({ selectedStateCode, onStateSelect }: USMapProps) => {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/50 rounded-xl border border-border/60 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interactive Map</span>
      </div>
      
      <ComposableMap projection="geoAlbersUsa">
        <Geographies geography={GEO_URL}>
          {({ geographies }) => (
            <>
              {geographies.map((geo) => {
                const fips = geo.id;
                const stateAbbr = fipsToAbbr[fips];
                const stateName = geo.properties.name;
                const isSelected = selectedStateCode === stateAbbr;

                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
                        geography={geo}
                        onClick={() => {
                          if (isSelected) {
                            onStateSelect(undefined, undefined); // Deselect
                          } else {
                            onStateSelect(stateAbbr, stateName);
                          }
                        }}
                        style={{
                          default: {
                            fill: isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))",
                            stroke: "hsl(var(--background))",
                            strokeWidth: 0.75,
                            outline: "none",
                            transition: "all 250ms ease",
                            cursor: "pointer"
                          },
                          hover: {
                            fill: isSelected ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)",
                            stroke: "hsl(var(--background))",
                            strokeWidth: 1,
                            outline: "none",
                            cursor: "pointer",
                            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                          },
                          pressed: {
                            fill: "hsl(var(--primary))",
                            outline: "none",
                          },
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{stateName}</p>
                      <p className="text-xs text-muted-foreground">Click to view details</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}
        </Geographies>
      </ComposableMap>
      
      {selectedStateCode && (
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onStateSelect(undefined, undefined);
           }}
           className="absolute bottom-4 right-4 text-xs bg-background border border-border shadow-sm px-3 py-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
         >
           Reset Selection
         </button>
      )}
    </div>
  );
};

export default memo(USMap);
