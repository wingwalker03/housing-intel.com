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
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import SubscribePage from "@/pages/subscribe";
import AccountPage from "@/pages/account";
import ForBusinessPage from "@/pages/for-business";
import ContactPage from "@/pages/contact";
import { SignupPrompt } from "@/components/signup-prompt";
import { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 font-mono whitespace-pre-wrap overflow-auto h-screen">
          <h1 className="text-2xl font-bold mb-4">Runtime Error</h1>
          <p className="mb-4">{this.state.error?.message}</p>
          <pre className="text-sm bg-red-100 p-4 rounded border border-red-200">
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/embed" component={EmbedPage} />
      <Route path="/embed-info" component={EmbedLandingPage} />
      <Route path="/api-docs" component={ApiDocumentation} />

      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/subscribe" component={SubscribePage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/for-business" component={ForBusinessPage} />
      <Route path="/contact" component={ContactPage} />

      <Route path="/" component={Dashboard} />
      <Route path="/states" component={Dashboard} />
      <Route path="/state/:stateSlug" component={Dashboard} />
      <Route path="/metros" component={Dashboard} />
      <Route path="/metro/:metroSlug" component={Dashboard} />
      <Route path="/crawl-hub" component={Dashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={100}>
          <Toaster />
          <Router />
          <SignupPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
