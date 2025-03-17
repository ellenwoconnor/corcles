import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import NotificationCenter from "@/components/notification-center";
import { Route } from 'react-router-dom'; // Assuming react-router-dom is used
import HomePage from "@/pages/home"; //Assumed path to home page

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <NotificationCenter />
      <Route path="/" element={<HomePage />} /> {/* Updated to use element prop */}
      <Toaster />
    </ThemeProvider>
  );
}

export default App;

//This is a placeholder for the NotificationCenter component.  A real implementation would require significantly more code.

//In "@/components/notification-center.js"
import React, { useState } from 'react';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, link) => {
    setNotifications([...notifications, { message, link }]);
  };

  return (
    <div>
      <h2>Notification Center</h2>
      <ul>
        {notifications.map((notification, index) => (
          <li key={index}>
            <a href={notification.link}>{notification.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationCenter;