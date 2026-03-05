import { QueryClient, QueryFunction } from "@tanstack/react-query";

const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    if (isDebug) {
      console.error(`API Error [${res.url}]: ${res.status} ${res.statusText}`, text.slice(0, 500));
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const absoluteUrl = new URL(url, window.location.origin).toString();
  
  if (isDebug) {
    console.log(`API Request: ${method} ${absoluteUrl}`, data);
  }

  const res = await fetch(absoluteUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (isDebug) {
    const contentType = res.headers.get("content-type");
    console.log(`API Response: ${res.status} ${contentType}`);
  }

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/");
    const absoluteUrl = new URL(path.startsWith('/') ? path : `/${path}`, window.location.origin).toString();

    if (isDebug) {
      console.log(`Query Fetch: ${absoluteUrl}`);
    }

    const res = await fetch(absoluteUrl, {
      credentials: "include",
    });

    const contentType = res.headers.get("content-type") || "";
    
    if (isDebug) {
      console.log(`Query Response: ${res.status} ${contentType}`);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (isDebug) {
        console.error("Expected JSON but got:", contentType, text.slice(0, 200));
      }
      if (text.trim().startsWith("<!DOCTYPE")) {
        throw new Error("HTML returned instead of JSON. Possible routing issue.");
      }
      throw new Error(`Invalid content type: ${contentType}`);
    }

    try {
      return await res.json();
    } catch (err) {
      const text = await res.text();
      if (isDebug) {
        console.error("JSON Parse Failure. Raw body:", text.slice(0, 200));
      }
      throw err;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
