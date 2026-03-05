import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import EmbedPage from "@/pages/embed";
import EmbedLandingPage from "@/pages/embed-info";
import { ApiDocumentation } from "@/pages/api-docs";

function Router() {
  return (
    <Switch>
      {/* Embed route - minimal chrome, no dashboard wrapper */}
      <Route path="/embed" component={EmbedPage} />
      <Route path="/embed-info" component={EmbedLandingPage} />
      <Route path="/api-docs" component={ApiDocumentation} />

      {/* SEO Routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/states" component={Dashboard} />
      <Route path="/state/:stateSlug" component={Dashboard} />
      <Route path="/metros" component={Dashboard} />
      <Route path="/metro/:metroSlug" component={Dashboard} />
      <Route path="/crawl-hub" component={Dashboard} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={100}>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
