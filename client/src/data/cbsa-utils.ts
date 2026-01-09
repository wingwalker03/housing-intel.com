import cbsaData from "./cbsa-boundaries.json";

export interface CBSAFeature {
  type: "Feature";
  properties: {
    CSAFP: string | null;
    CBSAFP: string;
    GEOID: string;
    NAME: string;
    NAMELSAD: string;
    LSAD: string;
    MEMI: string;
    MTFCC: string;
    ALAND: number;
    AWATER: number;
    INTPTLAT: string;
    INTPTLON: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface CBSAData {
  type: "FeatureCollection";
  features: CBSAFeature[];
}

const typedCbsaData = cbsaData as CBSAData;

export function getCBSAsByState(stateCode: string): CBSAFeature[] {
  const statePattern = new RegExp(`(,\\s*|-)${stateCode}(\\s*$|\\s*-|\\s*Metro|\\s*Micro)`);
  
  return typedCbsaData.features.filter((feature) => {
    const name = feature.properties.NAME;
    const parts = name.split(", ");
    if (parts.length < 2) return false;
    
    const statesPart = parts[parts.length - 1];
    const statesInName = statesPart.split("-");
    
    return statesInName.some((s) => s.trim() === stateCode);
  });
}

export function getCBSACentroid(feature: CBSAFeature): { lat: number; lng: number } {
  const lat = parseFloat(feature.properties.INTPTLAT);
  const lng = parseFloat(feature.properties.INTPTLON);
  return { lat, lng };
}

export function getCBSADisplayName(feature: CBSAFeature): string {
  const name = feature.properties.NAME;
  return name.replace(/,\s*[A-Z]{2}(-[A-Z]{2})*$/, "");
}

export function getAllCBSAs(): CBSAFeature[] {
  return typedCbsaData.features;
}

export function getCBSAById(cbsafp: string): CBSAFeature | undefined {
  return typedCbsaData.features.find((f) => f.properties.CBSAFP === cbsafp);
}

export function getCBSAByName(name: string): CBSAFeature | undefined {
  return typedCbsaData.features.find((f) => f.properties.NAME === name);
}
