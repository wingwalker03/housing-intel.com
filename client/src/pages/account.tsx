import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2, LogOut, CreditCard, Palette, Copy, Check, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function AccountPage() {
  const { user, isLoggedIn, isLoading, logout, hasActiveSubscription, subscriptionPlan } = useAuth();
  const [, setLocation] = useLocation();
  const [bgColor, setBgColor] = useState("#0f172a");
  const [embedView, setEmbedView] = useState<"map" | "chart" | "rental" | "rental-chart">("map");
  const [embedState, setEmbedState] = useState("");
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (sessionId) {
      apiRequest("POST", "/api/subscriptions/verify-session", { sessionId })
        .then((r) => r.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          window.history.replaceState({}, "", "/account");
        })
        .catch(console.error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoading, isLoggedIn, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const baseUrl = "https://housing-intel.com";
  const embedUrl = `${baseUrl}/embed?view=${embedView}${embedState ? `&state=${embedState}` : ""}&theme=${embedTheme}&bgColor=${encodeURIComponent(bgColor)}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" style="border-radius: 8px;"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access to API and/or embed features.")) return;
    setCanceling(true);
    try {
      await apiRequest("POST", "/api/subscriptions/cancel");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setCanceling(false);
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    setLocation("/");
  };

  const canAccessEmbed = hasActiveSubscription && (subscriptionPlan === "embed" || subscriptionPlan === "both");
  const canAccessApi = hasActiveSubscription && (subscriptionPlan === "api" || subscriptionPlan === "both");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold font-display">Housing<span className="text-primary">Intel</span></span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="text-account-title">Welcome, {user.firstName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <Card data-testid="card-subscription-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasActiveSubscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-sm font-medium rounded">Active</span>
                  <span className="font-medium capitalize">{subscriptionPlan === "both" ? "API + Embed Bundle" : subscriptionPlan === "api" ? "API Access" : "Embed Widgets"}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={canceling} data-testid="button-cancel-subscription">
                    {canceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground">No active subscription</p>
                <Link href="/subscribe">
                  <Button data-testid="button-go-subscribe">View Plans</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {canAccessEmbed && (
          <Card data-testid="card-embed-builder">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Embed Builder
              </CardTitle>
              <CardDescription>Create customized embeds with your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Embed Type</Label>
                  <select
                    value={embedView}
                    onChange={(e) => setEmbedView(e.target.value as any)}
                    className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    data-testid="select-embed-view"
                  >
                    <option value="map">Housing Map</option>
                    <option value="chart">Housing Chart</option>
                    <option value="rental">Rental Map</option>
                    <option value="rental-chart">Rental Chart</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">State (optional)</Label>
                  <Input
                    placeholder="e.g. TX, CA"
                    value={embedState}
                    onChange={(e) => setEmbedState(e.target.value.toUpperCase())}
                    maxLength={2}
                    data-testid="input-embed-state"
                  />
                </div>
                <div>
                  <Label className="text-sm">Theme</Label>
                  <select
                    value={embedTheme}
                    onChange={(e) => setEmbedTheme(e.target.value as "dark" | "light")}
                    className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    data-testid="select-embed-theme"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Background Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-9 h-9 rounded border border-input cursor-pointer"
                      data-testid="input-bg-color"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1"
                      data-testid="input-bg-color-text"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Preview</Label>
                <div className="rounded-lg overflow-hidden border border-border" style={{ backgroundColor: bgColor }}>
                  <iframe src={embedUrl.replace(baseUrl, "")} width="100%" height="400" frameBorder="0" />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Embed Code</Label>
                <div className="relative">
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto" data-testid="text-embed-code">{iframeCode}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                    data-testid="button-copy-embed"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Direct URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={embedUrl} readOnly className="text-xs" data-testid="input-embed-url" />
                  <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" data-testid="button-open-embed">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {canAccessApi && (
          <Card data-testid="card-api-access">
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>Use our REST API to access housing market data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Your API endpoints:</p>
              <ul className="space-y-2 text-sm font-mono">
                <li className="p-2 bg-muted rounded">GET /api/v1/public/states/:stateCode</li>
                <li className="p-2 bg-muted rounded">GET /api/v1/public/rent/:stateCode/:countyName</li>
                <li className="p-2 bg-muted rounded">GET /api/housing?stateCode=TX</li>
                <li className="p-2 bg-muted rounded">GET /api/metro?stateCode=TX</li>
              </ul>
              <Link href="/api-docs" className="inline-block mt-4">
                <Button variant="outline" size="sm" data-testid="link-api-docs">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full API Docs
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
