import cbsaData from "./cbsa-boundaries.json";
import type { CBSAFeature, CBSAData } from "./cbsa-utils";

const typedCbsaData = cbsaData as CBSAData;

export function getZillowMetroName(cbsaName: string): string {
  const nameParts = cbsaName.split(", ");
  if (nameParts.length < 2) return cbsaName;
  
  const citiesPart = nameParts[0];
  const statesPart = nameParts[nameParts.length - 1];
  
  const primaryState = statesPart.split("-")[0].trim();
  
  const slashParts = citiesPart.split("/");
  const firstSlashPart = slashParts[0].trim();
  
  const hyphenParts = firstSlashPart.split("-");
  
  let firstCity: string;
  if (hyphenParts.length >= 2) {
    const looksLikeMultipleCities = hyphenParts.every(part => {
      const trimmed = part.trim();
      return trimmed.length > 0 && trimmed[0] === trimmed[0].toUpperCase();
    });
    
    if (looksLikeMultipleCities && hyphenParts.length > 2) {
      firstCity = hyphenParts[0].trim();
    } else {
      firstCity = firstSlashPart;
    }
  } else {
    firstCity = firstSlashPart;
  }
  
  return `${firstCity}, ${primaryState}`;
}

export function getCBSAToZillowMap(): Map<string, string> {
  const map = new Map<string, string>();
  
  typedCbsaData.features.forEach((feature: CBSAFeature) => {
    const cbsafp = feature.properties.CBSAFP;
    const cbsaName = feature.properties.NAME;
    const zillowName = getZillowMetroName(cbsaName);
    map.set(cbsafp, zillowName);
  });
  
  return map;
}

const crosswalkMap = getCBSAToZillowMap();

export function lookupZillowMetro(cbsafp: string): string | undefined {
  return crosswalkMap.get(cbsafp);
}

export function lookupZillowMetroByName(cbsaName: string): string {
  return getZillowMetroName(cbsaName);
}
