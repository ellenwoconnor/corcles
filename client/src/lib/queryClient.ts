import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  options?: RequestInit
) {
  // For debugging
  console.log("Making API request:", method, url, body);

  try {
    const res = await fetch(url, {
      method,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      headers: {
        ...(!(body instanceof FormData) && { "Content-Type": "application/json" }),
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      console.error("API request failed:", method, url, res.status);
    }

    return res;
  } catch (error) {
    console.error("API request exception:", method, url, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Changed from Infinity to 0 to ensure fresh data on re-focus
      retry: false,
      gcTime: 1000 * 60 * 5, // 5 minutes garbage collection time (changed from cacheTime)
    },
    mutations: {
      retry: false,
    },
  },
});