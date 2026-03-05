import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Code2, 
  Mail, 
  Globe, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  ArrowRight,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { Link } from "wouter";

export default function EmbedLandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">
              Housing<span className="text-primary">Intel</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Back to Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Zap className="w-3 h-3" />
            <span>New Feature: Real-time Embeds</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight text-foreground mb-6">
            Bring Real-Time Housing Data <br />
            <span className="text-primary">Directly to Your Audience</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Easily embed interactive housing market charts and maps into your website, blog, or email newsletters. Stay relevant with the latest Zillow-powered statistics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base gap-2" asChild>
              <Link href="/">Try it on the Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2" asChild>
              <a href="#how-it-works">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-32">
            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Interactive Maps</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choropleth maps showing median home values across states and metros.
                </p>
                <div className="text-[10px] font-mono bg-muted p-2 rounded">view=map</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Trend Charts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Historical time-series charts for market growth and price fluctuations.
                </p>
                <div className="text-[10px] font-mono bg-muted p-2 rounded">view=chart</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Rental Maps</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  County-level rental price heatmaps powered by Zillow ZORI data.
                </p>
                <div className="text-[10px] font-mono bg-muted p-2 rounded">view=rental</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center mb-32 md:flex-row-reverse">
            <div className="order-2 md:order-1 relative group">
              <Card className="bg-card border-border shadow-2xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div className="text-sm font-bold">Email Snippet Preview</div>
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-[10px] whitespace-pre-wrap overflow-hidden">
                      {`<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background: #1f2937; color: #fff;">
      US Housing Market Stats
    </td>
  </tr>
  ...
</table>`}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic">Works in Gmail, Outlook, and Apple Mail</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6">Email Marketing Integration</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Boost your newsletter engagement by including live housing stats. Our email embed API provides a static, clean HTML table that renders perfectly in any inbox.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Javascript:</strong> Pure HTML/CSS fallback that passes through all spam filters.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Dynamic Fetching:</strong> Always shows the latest data available at the time of sending.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Personalized:</strong> Link directly to specific state or metro dashboards.</span>
                </li>
              </ul>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/">Email API Docs <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </div>
          </div>

          <div id="how-it-works" className="text-center mb-32">
            <h2 className="text-3xl font-bold mb-12">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold">Customize</h3>
                <p className="text-muted-foreground">Select your target area, view type, and theme on our dashboard.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold">Generate</h3>
                <p className="text-muted-foreground">One-click generates a secure iframe code or API endpoint URL.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold">Publish</h3>
                <p className="text-muted-foreground">Paste the snippet into your CMS or email platform and you're live.</p>
              </div>
            </div>
          </div>

          {/* Methodology Section */}
          <section className="mb-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Methodology</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Transparency is key to our data. Here is how we source and calculate the housing statistics shown in our widgets.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold">Data Source: Zillow ZHVI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our data is powered by the <strong>Zillow Home Value Index (ZHVI)</strong>. ZHVI is a smoothed, seasonally adjusted measure of the typical home value and market changes across a given region and housing type. It reflects the typical value for homes in the 35th to 65th percentile range.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 className="font-bold">YoY Calculation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Year-over-year (YoY) change is Zillow's preferred comparison as it effectively removes seasonality from the data:
                  </p>
                  <div className="bg-background/50 p-4 rounded-lg font-mono text-[11px] border border-border/50 text-center">
                    YoY % = ((Price<sub>t</sub> - Price<sub>t-12</sub>) / Price<sub>t-12</sub>) × 100
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-bold">Update Frequency</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Housing Intel synchronizes with Zillow's data releases monthly. New historical data points are typically processed and available by the 15th of each month, reflecting the previous month's finalized market activity.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="font-bold">Data Limitations</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                    <li><strong>Market Lag:</strong> ZHVI reflects closed sales, representing decisions made 30-60 days prior.</li>
                    <li><strong>Smoothing:</strong> A 3-month moving average is applied to reduce volatility.</li>
                    <li><strong>Granularity:</strong> Regional averages may vary from specific neighborhood conditions.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">Housing Intel</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Empowering real estate professionals with data transparency.
          </p>
          <div className="flex justify-center gap-8 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground">Dashboard</Link>
            <Link href="/embed-info" className="hover:text-foreground">Embed Features</Link>
            <a href="https://replit.com" target="_blank" rel="noreferrer" className="hover:text-foreground">About Replit</a>
          </div>
          <p className="text-xs text-muted-foreground/50">
            © 2026 Housing Intel. All housing data sourced from Zillow ZHVI.
          </p>
        </div>
      </footer>
    </div>
  );
}
