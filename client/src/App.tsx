import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Now from "@/pages/Now";
import Schedule from "@/pages/Schedule";
import Lineup from "@/pages/Lineup";
import MySets from "@/pages/MySets";
import Stages from "@/pages/Stages";
import StageDetail from "@/pages/StageDetail";
import ArtistDetail from "@/pages/ArtistDetail";
import SetDetail from "@/pages/SetDetail";
import Map from "@/pages/Map";
import Settings from "@/pages/Settings";
import Announcements from "@/pages/Announcements";
import { AppShell } from "@/components/AppShell";
import { NowProvider } from "@/lib/now";
function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Now} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/lineup" component={Lineup} />
      <Route path="/my-sets" component={MySets} />
      <Route path="/stages" component={Stages} />
      <Route path="/stages/:id" component={StageDetail} />
      <Route path="/artists/:id" component={ArtistDetail} />
      <Route path="/sets/:id" component={SetDetail} />
      <Route path="/map" component={Map} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <NowProvider>
            <AppShell>
              <AppRouter />
            </AppShell>
          </NowProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
