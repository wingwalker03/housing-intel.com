import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Check, Loader2, MessageSquare, Zap, Code2, Layers } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const plans = [
  {
    id: "api",
    name: "API Access",
    price: "$14.99",
    priceValue: 1499,
    icon: Code2,
    description: "REST API access to housing and rental data",
    features: [
      "Full REST API access",
      "State & metro housing data",
      "County rental data (ZORI)",
      "JSON responses with CORS",
      "Rate-limited to 1000 req/day",
    ],
  },
  {
    id: "embed",
    name: "Embed Widgets",
    price: "$24.99",
    priceValue: 2499,
    icon: Layers,
    popular: true,
    description: "Interactive maps and charts for your website",
    features: [
      "Interactive US housing map",
      "Rental price county map",
      "Time-series trend charts",
      "Custom background colors",
      "Dark & light theme support",
      "Responsive iframe embeds",
    ],
  },
  {
    id: "both",
    name: "API + Embed Bundle",
    price: "$29.99",
    priceValue: 2999,
    icon: Zap,
    description: "Everything in both plans at a discount",
    features: [
      "Full REST API access",
      "All embed widgets",
      "Custom background colors",
      "Priority support",
      "Best value — save $10/mo",
    ],
  },
];

export default function SubscribePage() {
  const { isLoggedIn, user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!isLoggedIn) {
      window.location.href = "/register";
      return;
    }
    setLoading(planId);
    try {
      const res = await apiRequest("POST", "/api/subscriptions/create-checkout", { plan: planId });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

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
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link href="/account">
                <Button variant="outline" size="sm" data-testid="link-account">My Account</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" data-testid="link-login">Log In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-display mb-4" data-testid="text-subscribe-title">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful housing market data and embeddable tools for your business
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg shadow-primary/10" : ""}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <plan.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  data-testid={`button-subscribe-${plan.id}`}
                >
                  {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isLoggedIn ? "Subscribe" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-2xl mx-auto" data-testid="card-enterprise">
          <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-muted-foreground">
                Looking for more features beyond what is currently offered? Custom data feeds, white-label solutions, or dedicated support?
              </p>
            </div>
            <Link href="/contact">
              <Button variant="outline" size="lg" data-testid="button-enterprise-contact">Contact Us</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
