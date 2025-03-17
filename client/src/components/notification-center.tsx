
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

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

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <Button
          key={notification.timestamp}
          className="bg-primary text-white flex items-center gap-2 shadow-lg"
          onClick={() => handleNotificationClick(notification)}
        >
          <Bell className="h-4 w-4" />
          <span>You've been selected for an item!</span>
        </Button>
      ))}
    </div>
  );
}
