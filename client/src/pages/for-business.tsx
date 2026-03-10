import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, BarChart3, Map, Code2, Layers, TrendingUp, Users, Zap } from "lucide-react";
import screenshot1 from "@assets/Screenshot_2026-03-09_at_6.38.51_PM_1773099826989.png";
import screenshot2 from "@assets/Screenshot_2026-03-09_at_6.40.53_PM_1773099826989.png";
import screenshot3 from "@assets/Screenshot_2026-03-09_at_6.42.13_PM_1773099826985.png";

export default function ForBusinessPage() {
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
          <div className="flex items-center gap-3">
            <Link href="/subscribe">
              <Button data-testid="link-subscribe">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-6" data-testid="text-business-title">
            How Housing Intel Can Work<br />for Your Business
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Empower your real estate business with interactive housing data visualizations, embeddable widgets, and a powerful REST API — all updated with the latest Zillow market data.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/subscribe">
              <Button size="lg" data-testid="button-view-plans">View Plans</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" data-testid="button-contact-sales">Talk to Sales</Button>
            </Link>
          </div>
        </section>

        <section className="bg-muted/30 py-20">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold font-display text-center mb-12">Interactive Data Tools</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <div>
                <img src={screenshot1} alt="Housing Intel rental prices and trend chart" className="rounded-xl shadow-2xl border border-border" data-testid="img-screenshot-1" />
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Map className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Interactive Rental & Housing Maps</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our county-level rental price map (ZORI data) and state-level housing value map give your clients an instant visual overview of market conditions. Click any state to drill down into county-level detail with trend charts showing historical price movement.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Perfect for listing presentations, client meetings, and your company website — embed these maps directly to showcase your local market expertise.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <div className="order-2 md:order-1 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Year-over-Year Trend Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track median home values and year-over-year growth across any state or metro area. Our trend charts show over 20 years of historical data, helping you and your clients understand long-term market patterns.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Use these insights for CMA reports, investment analysis, and market forecasting. The data updates monthly with the latest Zillow Home Value Index (ZHVI) figures.
                </p>
              </div>
              <div className="order-1 md:order-2">
                <img src={screenshot2} alt="Year-over-year housing trend chart" className="rounded-xl shadow-2xl border border-border" data-testid="img-screenshot-2" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <img src={screenshot3} alt="County-level rental heat map" className="rounded-xl shadow-2xl border border-border" data-testid="img-screenshot-3" />
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Rental Market Intelligence</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Powered by Zillow Observed Rent Index (ZORI) data, our rental maps display median rents across every US county with data coverage. The heat-map visualization makes it easy to spot opportunities and compare markets at a glance.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Whether you're advising investors on rental properties or helping tenants understand fair market rent, this data gives you a competitive edge.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold font-display text-center mb-4">Two Ways to Integrate</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Choose the integration method that fits your workflow
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              <Card data-testid="card-embed-feature">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Embeddable Widgets</h3>
                  <p className="text-muted-foreground">
                    Drop interactive housing maps and trend charts directly into your website with a simple iframe code. Customize the background color to match your brand, choose between dark and light themes, and filter by state or metro area.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> One-line embed code</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Custom brand colors</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Mobile responsive</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Auto-updating data</li>
                  </ul>
                </CardContent>
              </Card>

              <Card data-testid="card-api-feature">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">REST API</h3>
                  <p className="text-muted-foreground">
                    Build custom applications with our JSON REST API. Access state-level housing data, metro-level trends, and county rental prices programmatically. Full CORS support means you can call the API from any web application.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> JSON responses</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> CORS enabled</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Historical data access</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> State, metro, county data</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-primary/5 py-20">
          <div className="container max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold font-display mb-4">Built for Real Estate Professionals</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Whether you're a broker, property manager, appraiser, or investor, Housing Intel provides the data tools you need to make informed decisions and impress your clients.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/subscribe">
                <Button size="lg" data-testid="button-get-started-bottom">Get Started</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" data-testid="button-contact-bottom">Contact Us</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
