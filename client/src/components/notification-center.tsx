import { useState, useEffect } from "react";
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

interface Notification {
  id: string;
  type: string;
  data: {
    itemId: number;
    itemTitle: string;
  };
  timestamp: number;
  read: boolean;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const response = await apiRequest('GET', '/api/notifications');
        console.log('Fetched notifications:', response); // Debug log
        // Ensure we always set an array, even if empty
        setNotifications(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setNotifications([]);
      }
    };

    fetchNotifications();

    // Set up SSE for new notifications
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received SSE message:', data); // Debug log
      if (data.type === "recipient_selected") {
        setNotifications((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            type: data.type,
            data: {
              itemId: data.data.itemId,
              itemTitle: data.data.title || "an item",
            },
            timestamp: Date.now(),
            read: false,
          },
        ]);
      }
    };

    return () => eventSource.close();
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.data.itemId) {
      try {
        // Mark as read
        await apiRequest('POST', `/api/notifications/${notification.id}/acknowledge`);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );

        // Navigate to item
        setLocation(`/item/${notification.data.itemId}`);
      } catch (error) {
        console.error('Failed to acknowledge notification:', error);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
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
            <Bell className="h-8 w-8 text-muted-foreground" />
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
                  notification.read ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>
                    You've been selected for {notification.data.itemTitle}!
                  </span>
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
  );
}