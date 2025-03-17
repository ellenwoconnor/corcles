import { Toaster } from "@/components/ui/toaster";
import { NotificationCenter } from "@/components/notification-center";
import { Router } from "@/components/router";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router />
      <NotificationCenter />
      <Toaster />
    </ThemeProvider>
  );
}
