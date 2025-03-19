import { useEffect, useState } from "react";
import { MessageDialog } from "./message-dialog";
import { useLocation } from "wouter";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  data: {
    itemId?: number;
    itemTitle?: string;
    messageId?: string;
    senderId?: string;
    content?: string;
    requestId?: string;
  };
  timestamp: number;
  read: boolean;
}

export default function NotificationCenter() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch notifications using React Query
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      const data = await response.json();
      console.log("Fetched notifications in client:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    // Set up SSE for new notifications
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received SSE message:", data);
      if (data.type === "recipient_selected") {
        // Invalidate the notifications query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    };

    return () => eventSource.close();
  }, [queryClient]);

  const handleNotificationClick = async (notification: Notification) => {
    console.log("notification", notification);
    try {
      // Acknowledge notification
      await apiRequest(
        "POST",
        `/api/notifications/${notification.id}/acknowledge`,
      );

      // Invalidate queries to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Navigate to the related item
      const notificationData = notification.data as {
        itemId?: number;
        itemTitle?: string;
      };
      console.log(notification.data);
      if (notificationData.itemId) {
        setLocation(`/item/${notificationData.itemId}`);
      }
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-6">
              <p className="text-sm text-muted-foreground">
                No new notifications
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 p-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-accent rounded-sm ${
                    notification.read ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    {notification.type === "pickup_scheduled" ? (
                      <>
                        <span>
                          Pickup scheduled for {notification.data.itemTitle}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(
                            notification.data.pickupStart,
                          ).toLocaleString()}{" "}
                          -{" "}
                          {new Date(
                            notification.data.pickupEnd,
                          ).toLocaleTimeString()}
                        </span>
                      </>
                    ) : notification.type === "new_message" ? (
                      <span>New message: {notification.data.content}</span>
                    ) : (
                      <span>
                        You've been selected for {notification.data.itemTitle}!
                      </span>
                    )}
                  </div>
                  {notification.read && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
