import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emailConfirmed: boolean;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
}

export function useAuth() {
  const { data, isLoading } = useQuery<{ user: AuthUser | null }>({
    queryKey: ["/api/auth/me"],
    staleTime: 60000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", creds);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return {
    user: data?.user || null,
    isLoading,
    isLoggedIn: !!data?.user,
    hasActiveSubscription: data?.user?.subscriptionStatus === "active",
    subscriptionPlan: data?.user?.subscriptionPlan || null,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
