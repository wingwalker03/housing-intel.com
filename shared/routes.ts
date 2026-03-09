import { z } from 'zod';
import { insertHousingStatSchema, housingStats, metroStats, countyRentalStats } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  housing: {
    list: {
      method: 'GET' as const,
      path: '/api/housing',
      input: z.object({
        stateCode: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof housingStats.$inferSelect>()),
      },
    },
    states: {
      method: 'GET' as const,
      path: '/api/states',
      responses: {
        200: z.array(z.object({ code: z.string(), name: z.string() })),
      },
    },
    uploadCsv: {
      method: 'POST' as const,
      path: '/api/housing/upload',
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        400: errorSchemas.validation,
      },
    },
  },
  metro: {
    list: {
      method: 'GET' as const,
      path: '/api/metro',
      input: z.object({
        stateCode: z.string().optional(),
        metroName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof metroStats.$inferSelect>()),
      },
    },
    byState: {
      method: 'GET' as const,
      path: '/api/metro/by-state',
      input: z.object({
        stateCode: z.string(),
      }),
      responses: {
        200: z.array(z.object({ name: z.string() })),
      },
    },
  },
  countyRental: {
    list: {
      method: 'GET' as const,
      path: '/api/county-rental',
      input: z.object({
        stateCode: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof countyRentalStats.$inferSelect>()),
      },
    },
    latest: {
      method: 'GET' as const,
      path: '/api/county-rental/latest',
      input: z.object({
        stateCode: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          countyName: z.string(),
          normalizedName: z.string(),
          stateCode: z.string(),
          stateName: z.string(),
          zori: z.number(),
          date: z.string(),
        })),
      },
    },
    trend: {
      method: 'GET' as const,
      path: '/api/county-rental/trend',
      input: z.object({
        stateCode: z.string().optional(),
        metro: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          date: z.string(),
          avgZori: z.number(),
          count: z.number(),
        })),
      },
    },
    summary: {
      method: 'GET' as const,
      path: '/api/summary',
      responses: {
        200: z.object({
          national: z.object({
            medianHomeValue: z.number(),
            latestDate: z.string(),
            totalStates: z.number(),
            totalMetros: z.number(),
          }),
          states: z.array(z.object({
            code: z.string(),
            name: z.string(),
            latestValue: z.number(),
            latestDate: z.string(),
          })),
          topMetros: z.array(z.object({
            name: z.string(),
            stateCode: z.string(),
            latestValue: z.number(),
            latestDate: z.string(),
          })),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type HousingStat = z.infer<typeof api.housing.list.responses[200]>[number];
export type StateInfo = z.infer<typeof api.housing.states.responses[200]>[number];
export type MetroStat = z.infer<typeof api.metro.list.responses[200]>[number];
export type MetroInfo = z.infer<typeof api.metro.byState.responses[200]>[number];
