import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Re-export types for convenience
export type HousingStat = z.infer<typeof api.housing.list.responses[200]>[number];
export type StateInfo = z.infer<typeof api.housing.states.responses[200]>[number];

export interface HousingFilters {
  stateCode?: string;
  startDate?: string;
  endDate?: string;
}

export function useHousingStats(filters?: HousingFilters) {
  // Create a stable query key based on filters
  const queryKey = [api.housing.list.path, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Build URL with query params
      // Since filters might be undefined, we cast to Record<string, string> cautiously or filter out undefineds
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
