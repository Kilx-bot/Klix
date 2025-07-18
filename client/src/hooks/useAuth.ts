import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/auth/user"],
    queryFn: () => apiRequest("/auth/user"),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}