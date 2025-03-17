import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "recipient_selected") {
        setNotifications((prev) => [
          ...prev,
          {
            type: data.type,
            data: data.data,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    return () => eventSource.close();
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.data.itemId) {
      setLocation(`/item/${notification.data.itemId}`);
      setNotifications((prev) =>
        prev.filter((n) => n.timestamp !== notification.timestamp),
      );
    }
    setIsOpen(false);
  };

  console.log("is open?", isOpen);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={(e) => {
          console.log('Button clicked');
          e.preventDefault();
          setIsOpen(!isOpen);
          console.log('isOpen state updated to:', !isOpen);
        }}
      >
        <Bell className="h-5 w-5 text-foreground fill-foreground stroke-foreground" />
        {notifications.length > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
          >
            {notifications.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[300px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No new notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.timestamp}
                onClick={() => handleNotificationClick(notification)}
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent rounded-sm"
              >
                <Bell className="h-4 w-4 fill-foreground" />
                <span>You've been selected for an item!</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}