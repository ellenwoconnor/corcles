import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function useNotifications() {
  return useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Consider data immediately stale to enable real-time updates
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function useConversation(userId: number, requestId: number) {
  return useQuery({
    queryKey: ['/api/messages', userId, requestId],
    refetchInterval: 3000,
    staleTime: 0,
  });
}
