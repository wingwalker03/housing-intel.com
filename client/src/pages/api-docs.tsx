import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Code2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function ApiDocumentation() {
  const { toast } = useToast();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const endpoints = [
    {
      name: "Housing Statistics",
      description: "Get historical median home values and YoY growth.",
      path: "/api/housing",
      method: "GET",
      params: [
        { name: "stateCode", description: "Optional 2-letter state code (e.g., NY)" },
        { name: "startDate", description: "Optional start date (YYYY-MM-DD)" },
        { name: "endDate", description: "Optional end date (YYYY-MM-DD)" },
      ]
    },
    {
      name: "Metro Statistics",
      description: "Get statistics for specific metropolitan areas.",
      path: "/api/metro",
      method: "GET",
      params: [
        { name: "stateCode", description: "Optional 2-letter state code" },
        { name: "metroName", description: "Optional full metro name" },
      ]
    },
    {
      name: "County Rental Data (ZORI)",
      description: "Get latest rental price index data by county.",
      path: "/api/county-rental/latest",
      method: "GET",
      params: [
        { name: "stateCode", description: "Optional 2-letter state code" },
      ]
    },
    {
      name: "Rental Trends",
      description: "Get aggregated rental price trends over time.",
      path: "/api/county-rental/trend",
      method: "GET",
      params: [
        { name: "stateCode", description: "Optional 2-letter state code" },
      ]
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    toast({
      title: "Copied to clipboard",
      description: "The API endpoint has been copied.",
    });
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Housing Intel API</h1>
        <p className="text-muted-foreground">
          Access our comprehensive housing and rental market data programmatically.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Authentication</CardTitle>
          <CardDescription>
            Public endpoints do not require an API key for reasonable usage. 
            For high-volume access, please contact our team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
            Base URL: {baseUrl}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.path} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs font-bold">
                      {endpoint.method}
                    </span>
                    <CardTitle className="text-base">{endpoint.name}</CardTitle>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2"
                  onClick={() => window.open(`${baseUrl}${endpoint.path}`, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Try it
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md group">
                <code className="flex-1 font-mono text-sm">{endpoint.path}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(`${baseUrl}${endpoint.path}`)}
                >
                  {copiedPath === `${baseUrl}${endpoint.path}` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {endpoint.params.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Query Parameters</h4>
                  <div className="grid gap-2">
                    {endpoint.params.map((param) => (
                      <div key={param.name} className="flex items-start gap-4 text-sm border-b pb-2 last:border-0">
                        <code className="text-primary font-semibold min-w-[100px]">{param.name}</code>
                        <span className="text-muted-foreground">{param.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Need custom data exports? Contact info@housing-intel.com</p>
      </div>
    </div>
  );
}
