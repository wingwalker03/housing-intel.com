import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Code, Copy, Check, Mail, Globe } from "lucide-react";
import { STATE_CODE_TO_NAME } from "@/lib/slugs";
import { useToast } from "@/hooks/use-toast";

interface EmbedBuilderProps {
  currentStateCode?: string;
  currentStateName?: string;
  currentMetroName?: string;
}

export function EmbedBuilder({
  currentStateCode,
  currentStateName,
  currentMetroName,
}: EmbedBuilderProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"map" | "chart" | "both" | "rental">("both");
  const [stateCode, setStateCode] = useState(currentStateCode || "");
  const [metro, setMetro] = useState(currentMetroName || "");
  const [metric, setMetric] = useState<"medianHomeValue" | "yoyChange">("medianHomeValue");
  const [timeRange, setTimeRange] = useState("10y");
  const [theme, setTheme] = useState("dark");
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("500");
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://housing-intel.com";

  const embedUrl = useMemo(() => {
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
    const w = width.includes("%") ? width : `${width}px`;
    const h = `${height}px`;
    return `<iframe src="${embedUrl}" width="${w}" height="${h}" frameborder="0" style="border:none;border-radius:8px;overflow:hidden;" loading="lazy" title="Housing Intel - ${metro || (stateCode ? STATE_CODE_TO_NAME[stateCode] : "US")} Housing Data"></iframe>`;
  }, [embedUrl, width, height, metro, stateCode]);

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

  const stateOptions = Object.entries(STATE_CODE_TO_NAME)
    .sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-embed-builder">
          <Code className="w-4 h-4" />
          Embed
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed Housing Data</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="web" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="web" className="gap-1.5" data-testid="tab-embed-web">
              <Globe className="w-4 h-4" />
              Web Embed
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5" data-testid="tab-embed-email">
              <Mail className="w-4 h-4" />
              Email Embed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="web" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">View Type</Label>
                <Select value={view} onValueChange={(v) => setView(v as any)}>
                  <SelectTrigger data-testid="select-embed-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Map + Chart)</SelectItem>
                    <SelectItem value="map">Housing Map Only</SelectItem>
                    <SelectItem value="chart">Growth Chart Only</SelectItem>
                    <SelectItem value="rental">Rental Map Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
                <Select value={stateCode || "national"} onValueChange={(v) => { setStateCode(v === "national" ? "" : v); setMetro(""); }}>
                  <SelectTrigger data-testid="select-embed-state">
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

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Chart Metric</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                  <SelectTrigger data-testid="select-embed-metric">
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
                  <SelectTrigger data-testid="select-embed-range">
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

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger data-testid="select-embed-theme">
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
                  <SelectTrigger data-testid="select-embed-height">
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
              <div className="border border-border rounded-lg overflow-hidden" style={{ height: `${Math.min(parseInt(height), 400)}px` }}>
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
                <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" data-testid="text-embed-code">
                  {iframeCode}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(iframeCode, "web")}
                  data-testid="button-copy-embed"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Direct Link</Label>
              <div className="relative">
                <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" data-testid="text-embed-link">
                  {embedUrl}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(embedUrl, "web")}
                  data-testid="button-copy-link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
                <Select value={stateCode || "national"} onValueChange={(v) => { setStateCode(v === "national" ? "" : v); setMetro(""); }}>
                  <SelectTrigger data-testid="select-email-state">
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
            </div>

            <p className="text-xs text-muted-foreground">
              Email clients do not support interactive content. The email embed provides a static HTML table 
              with the latest housing statistics that works in all major email clients (Gmail, Outlook, Apple Mail).
            </p>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email Snippet API</Label>
              <div className="relative">
                <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" data-testid="text-email-api-url">
                  {emailApiUrl}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(emailApiUrl, "email")}
                  data-testid="button-copy-email-url"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Usage</Label>
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs space-y-2">
                <p><strong>Fetch the HTML snippet:</strong></p>
                <code className="block font-mono text-[11px] bg-background/50 p-2 rounded">
                  GET {emailApiUrl}
                </code>
                <p className="mt-2">The response is a self-contained HTML table. Paste it directly into your email template or marketing tool.</p>
                <p className="mt-2"><strong>Parameters:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><code className="font-mono">state</code> - Two-letter state code (e.g., CA, TX). Omit for national data.</li>
                  <li><code className="font-mono">metro</code> - Metro area name (e.g., "New York, NY"). Omit for state-level data.</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
