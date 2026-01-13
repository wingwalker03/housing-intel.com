import { useMemo, useEffect } from "react";

interface SEOContentProps {
  type: "national" | "state" | "metro";
  stateName?: string;
  stateCode?: string;
  metroName?: string;
  latestValue?: number;
  yoyChange?: number;
  historicalHigh?: number;
  dataYears?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function SEOContent({
  type,
  stateName,
  stateCode,
  metroName,
  latestValue,
  yoyChange,
  historicalHigh,
  dataYears = 10
}: SEOContentProps) {
  const content = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const valueStr = latestValue ? formatCurrency(latestValue) : "data pending";
    const yoyStr = yoyChange !== undefined ? formatPercent(yoyChange) : "N/A";
    const highStr = historicalHigh ? formatCurrency(historicalHigh) : "data pending";
    const trendDirection = yoyChange !== undefined ? (yoyChange >= 0 ? "appreciation" : "decline") : "fluctuation";
    const marketCondition = yoyChange !== undefined ? (yoyChange > 5 ? "strong seller's market" : yoyChange > 0 ? "balanced market with modest growth" : yoyChange > -5 ? "cooling market" : "buyer's market") : "evolving conditions";

    const geoName = type === "national" ? "the United States" : (type === "state" ? stateName : metroName);
    const pctFromHigh = (latestValue && historicalHigh) ? Math.abs(((latestValue - historicalHigh) / historicalHigh) * 100).toFixed(1) : "0";
    const relativeToHigh = (latestValue && historicalHigh) ? (latestValue >= historicalHigh ? "at or above" : "below") : "near";
    const momentum = yoyChange !== undefined ? (yoyChange > 2 ? "gaining momentum" : yoyChange < -2 ? "cooling" : "stabilizing") : "evolving";
    const upDown = yoyChange !== undefined ? (yoyChange >= 0 ? "up" : "down") : "changed";
    const absYoY = yoyChange !== undefined ? Math.abs(yoyChange).toFixed(1) : "0";

    const commonBody = `
      <p>Home prices in ${geoName} are currently sitting around ${valueStr}, with prices ${upDown} ${absYoY}% compared to this time last year. This suggests the market is ${momentum}, depending on recent buyer demand and local economic conditions.</p>

      <h3>How this compares to the past</h3>
      <p>At its recent peak, the market reached ${highStr}, meaning prices today are ${relativeToHigh} that level by about ${pctFromHigh}%. Historically, periods like this have often marked either a pause after rapid growth or an early shift toward the next cycle.</p>

      <h3>What this means for buyers and sellers</h3>
      <p>For buyers, this environment may offer more negotiating room than in recent years, especially in areas where price growth has slowed. Sellers, on the other hand, may need to price more carefully and pay closer attention to local demand rather than relying on broad market momentum.</p>

      <h3>What to keep an eye on next</h3>
      <p>Future price movement in ${geoName} will likely depend on factors such as interest rates, job growth, and new housing supply. Tracking year-over-year changes alongside longer-term trends can help separate short-term noise from meaningful shifts in the market.</p>

      <h3>Explore deeper</h3>
      <p>Use the interactive map and charts above to compare nearby metros, view longer historical trends, and see how this market stacks up against others across the country.</p>
    `;

    if (type === "national") {
      return {
        title: `US Housing Market Overview ${currentYear} | Home Prices & Trends`,
        description: `Explore the US housing market with median home values at ${valueStr} and ${yoyStr} year-over-year growth. View historical trends, state comparisons, and metro area data.`,
        heading: `Housing Market Snapshot: United States`,
        body: commonBody
      };
    }

    if (type === "state" && stateName) {
      return {
        title: `${stateName} Housing Market ${currentYear} | Home Prices & Trends | ${stateCode}`,
        description: `${stateName} housing market data: median home value ${valueStr}, ${yoyStr} YoY change. Explore ${stateName} real estate trends, metro areas, and historical price data.`,
        heading: `Housing Market Snapshot: ${stateName}`,
        body: commonBody
      };
    }

    if (type === "metro" && metroName) {
      return {
        title: `${metroName} Housing Market ${currentYear} | Home Prices & Real Estate Trends`,
        description: `${metroName} housing data: median home price ${valueStr}, ${yoyStr} year-over-year change. Explore ${metroName} real estate trends and historical market data.`,
        heading: `Housing Market Snapshot: ${metroName}`,
        body: commonBody
      };
    }

    return {
      title: "US Housing Market Dashboard",
      description: "Interactive housing market data and trends for the United States.",
      heading: "Housing Market Data",
      body: "<p>Explore housing market statistics and trends.</p>"
    };
  }, [type, stateName, stateCode, metroName, latestValue, yoyChange, historicalHigh, dataYears]);

  useEffect(() => {
    document.title = content.title;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', content.description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', content.title);

    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', content.description);
  }, [content.title, content.description]);

  return (
    <section className="bg-muted/30 border-t border-border mt-12 pt-8 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-4 text-foreground">{content.heading}</h2>
          <div 
            className="text-muted-foreground leading-relaxed space-y-4 [&>h3]:text-foreground [&>h3]:font-medium [&>h3]:mt-6 [&>h3]:mb-2 [&>h3]:text-base [&>p]:mb-4"
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        </article>
      </div>
    </section>
  );
}
