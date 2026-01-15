import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export type HousingStat = z.infer<typeof api.housing.list.responses[200]>[number];
export type StateInfo = z.infer<typeof api.housing.states.responses[200]>[number];
export type MetroStat = z.infer<typeof api.metro.list.responses[200]>[number];
export type MetroInfo = z.infer<typeof api.metro.byState.responses[200]>[number];

export interface HousingFilters {
  stateCode?: string;
  startDate?: string;
  endDate?: string;
}

export interface MetroFilters {
  stateCode?: string;
  metroName?: string;
  startDate?: string;
  endDate?: string;
}

export function useHousingStats(filters?: HousingFilters) {
  const queryKey = [api.housing.list.path, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.stateCode) params.stateCode = filters.stateCode;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const url = filters ? `${api.housing.list.path}?${new URLSearchParams(params)}` : api.housing.list.path;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch housing stats");
      
      return api.housing.list.responses[200].parse(await res.json());
    },
  });
}

export function useStates() {
  return useQuery({
    queryKey: [api.housing.states.path],
    queryFn: async () => {
      const res = await fetch(api.housing.states.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch states");
      
      return api.housing.states.responses[200].parse(await res.json());
    },
  });
}

export function useMetroStats(filters?: MetroFilters) {
  const queryKey = [api.metro.list.path, filters];

  return useQuery({
    queryKey,
    enabled: !!filters?.stateCode || !!filters?.metroName,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.stateCode) params.stateCode = filters.stateCode;
      if (filters?.metroName) params.metroName = filters.metroName;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const url = `${api.metro.list.path}?${new URLSearchParams(params)}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metro stats");
      
      return api.metro.list.responses[200].parse(await res.json());
    },
  });
}

export function useMetrosByState(stateCode?: string) {
  return useQuery({
    queryKey: [api.metro.byState.path, stateCode],
    enabled: !!stateCode,
    queryFn: async () => {
      const url = `${api.metro.byState.path}?stateCode=${stateCode}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metros");
      
      return api.metro.byState.responses[200].parse(await res.json());
    },
  });
}

export interface MarketSentiment {
  marketType: string;
  marketSlug: string;
  sentiment: string | null;
  sentimentScore: number | null;
  sentimentSummary: string | null;
  weekStart: string;
}

export function useMarketSentiment(marketType?: string, marketSlug?: string) {
  return useQuery<MarketSentiment | null>({
    queryKey: ["/api/sentiment", marketType, marketSlug],
    enabled: !!marketType && !!marketSlug,
    queryFn: async () => {
      const res = await fetch(`/api/sentiment/${marketType}/${marketSlug}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch sentiment");
      return res.json();
    },
  });
}

export function useAllSentiments() {
  return useQuery<MarketSentiment[]>({
    queryKey: ["/api/sentiment"],
    queryFn: async () => {
      const res = await fetch("/api/sentiment", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sentiments");
      return res.json();
    },
  });
}
