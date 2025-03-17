
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  type: string;
  data: {
    itemId: number;
    title?: string;
  };
  timestamp: number;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "recipient_selected") {
        setNotifications(prev => [...prev, {
          type: data.type,
          data: data.data,
          timestamp: Date.now()
        }]);
      }
    };

    return () => eventSource.close();
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.data.itemId) {
      setLocation(`/item/${notification.data.itemId}`);
      setNotifications(prev => 
        prev.filter(n => n.timestamp !== notification.timestamp)
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No new notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.timestamp}
              onClick={() => handleNotificationClick(notification)}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>You've been selected for an item!</span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
