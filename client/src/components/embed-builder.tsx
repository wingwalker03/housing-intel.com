import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Copy, Check, Mail, Globe, Map, TrendingUp, Home, ArrowLeft } from "lucide-react";
import { STATE_CODE_TO_NAME } from "@/lib/slugs";
import { useToast } from "@/hooks/use-toast";

interface EmbedBuilderProps {
  stateCode?: string;
  metroName?: string;
}

type ViewType = "rental" | "map" | "chart";

const VIEW_OPTIONS: {
  value: ViewType;
  icon: React.ElementType;
  label: string;
  description: string;
}[] = [
  {
    value: "rental",
    icon: Map,
    label: "Rental Price Map",
    description: "County-level ZORI rental heat map across the US",
  },
  {
    value: "map",
    icon: Home,
    label: "State Housing Map",
    description: "US choropleth map colored by median home value",
  },
  {
    value: "chart",
    icon: TrendingUp,
    label: "Housing Graph",
    description: "Time-series trend chart for a state or national market",
  },
];

export function EmbedBuilder({ stateCode: initialStateCode, metroName: initialMetroName }: EmbedBuilderProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewType | null>(null);
  const [stateCode, setStateCode] = useState(initialStateCode || "");
  const [metro, setMetro] = useState(initialMetroName || "");
  const [metric, setMetric] = useState<"medianHomeValue" | "yoyChange">("medianHomeValue");
  const [timeRange, setTimeRange] = useState("10y");
  const [theme, setTheme] = useState("dark");
  const [height, setHeight] = useState("500");
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://housing-intel.com";

  const embedUrl = useMemo(() => {
    if (!view) return "";
    const params = new URLSearchParams();
    params.set("view", view);
    if (stateCode) params.set("state", stateCode);
    if (metro) params.set("metro", metro);
    params.set("metric", metric);
    params.set("range", timeRange);
    params.set("theme", theme);
    return `${baseUrl}/embed?${params.toString()}`;
  }, [view, stateCode, metro, metric, timeRange, theme, baseUrl]);

  const iframeCode = useMemo(() => {
    if (!view) return "";
    const h = `${height}px`;
    const label = metro || (stateCode ? STATE_CODE_TO_NAME[stateCode] : "US");
    return `<iframe src="${embedUrl}" width="100%" height="${h}" frameborder="0" style="border:none;border-radius:8px;overflow:hidden;" loading="lazy" title="Housing Intel - ${label} Housing Data"></iframe>`;
  }, [embedUrl, height, metro, stateCode, view]);

  const emailApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (stateCode) params.set("state", stateCode);
    if (metro) params.set("metro", metro);
    return `${baseUrl}/api/embed/email?${params.toString()}`;
  }, [stateCode, metro, baseUrl]);

  const handleCopy = async (text: string, type: "web" | "email") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "web") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
      toast({ title: "Copied!", description: "Embed code copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please select and copy manually.", variant: "destructive" });
    }
  };

  const stateOptions = Object.entries(STATE_CODE_TO_NAME).sort((a, b) => a[1].localeCompare(b[1]));

  if (!view) {
    return (
      <div className="space-y-6 py-2">
        <div>
          <p className="text-sm text-muted-foreground">Choose what you want to embed on your site or app.</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setView(opt.value)}
                data-testid={`button-embed-view-${opt.value}`}
                className="flex items-center gap-4 w-full text-left rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/60 transition-all duration-150 p-4 group"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedOption = VIEW_OPTIONS.find((o) => o.value === view)!;
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="space-y-5 py-2">
      <button
        onClick={() => setView(null)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-embed-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Change type
      </button>

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
        <SelectedIcon className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">{selectedOption.label}</p>
          <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
        </div>
      </div>

      <Tabs defaultValue="web">
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="web" className="gap-1.5 data-[state=active]:bg-background" data-testid="tab-embed-web">
            <Globe className="w-4 h-4" />
            Web Embed
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 data-[state=active]:bg-background" data-testid="tab-embed-email">
            <Mail className="w-4 h-4" />
            Email Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="web" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {view !== "rental" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
                <Select
                  value={stateCode || "national"}
                  onValueChange={(v) => { setStateCode(v === "national" ? "" : v); setMetro(""); }}
                >
                  <SelectTrigger data-testid="select-embed-state" className="bg-muted/30 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National (US)</SelectItem>
                    {stateOptions.map(([code, name]) => (
                      <SelectItem key={code} value={code}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {view === "chart" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Metric</Label>
                  <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                    <SelectTrigger data-testid="select-embed-metric" className="bg-muted/30 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medianHomeValue">Median Home Value</SelectItem>
                      <SelectItem value="yoyChange">YoY Change %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger data-testid="select-embed-range" className="bg-muted/30 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5y">5 Years</SelectItem>
                      <SelectItem value="10y">10 Years</SelectItem>
                      <SelectItem value="20y">20 Years</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger data-testid="select-embed-theme" className="bg-muted/30 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Height (px)</Label>
              <Select value={height} onValueChange={setHeight}>
                <SelectTrigger data-testid="select-embed-height" className="bg-muted/30 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">300px</SelectItem>
                  <SelectItem value="400">400px</SelectItem>
                  <SelectItem value="500">500px</SelectItem>
                  <SelectItem value="600">600px</SelectItem>
                  <SelectItem value="800">800px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Preview</Label>
            <div
              className="border border-border rounded-lg overflow-hidden bg-muted/10"
              style={{ height: `${Math.min(parseInt(height), 360)}px` }}
            >
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: "none" }}
                title="Embed Preview"
                data-testid="iframe-embed-preview"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Embed Code</Label>
            <div className="relative">
              <pre
                className="bg-muted/30 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-foreground"
                data-testid="text-embed-code"
              >
                {iframeCode}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 hover:bg-muted/50"
                onClick={() => handleCopy(iframeCode, "web")}
                data-testid="button-copy-embed"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Direct Link</Label>
            <div className="relative">
              <pre
                className="bg-muted/30 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-foreground"
                data-testid="text-embed-link"
              >
                {embedUrl}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 hover:bg-muted/50"
                onClick={() => handleCopy(embedUrl, "web")}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
            <Select
              value={stateCode || "national"}
              onValueChange={(v) => { setStateCode(v === "national" ? "" : v); setMetro(""); }}
            >
              <SelectTrigger data-testid="select-email-state" className="bg-muted/30 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">National (US)</SelectItem>
                {stateOptions.map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Email clients don't support interactive content. The email embed provides a static HTML table
            with the latest housing statistics that works in Gmail, Outlook, and Apple Mail.
          </p>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email Snippet API</Label>
            <div className="relative">
              <pre
                className="bg-muted/30 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-foreground"
                data-testid="text-email-api-url"
              >
                {emailApiUrl}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 hover:bg-muted/50"
                onClick={() => handleCopy(emailApiUrl, "email")}
                data-testid="button-copy-email-url"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs space-y-2">
            <p className="font-semibold text-foreground">Usage</p>
            <code className="block font-mono text-[11px] bg-background/50 p-2 rounded text-foreground">
              GET {emailApiUrl}
            </code>
            <p className="text-muted-foreground mt-2">
              The response is a self-contained HTML table. Paste it directly into your email template or marketing tool.
            </p>
            <p className="font-semibold text-foreground mt-2">Parameters</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><code className="font-mono text-foreground">state</code> — Two-letter state code (e.g., CA, TX). Omit for national data.</li>
              <li><code className="font-mono text-foreground">metro</code> — Metro area name. Omit for state-level data.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
