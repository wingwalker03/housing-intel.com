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

    const stateSummary = `
      <p>The ${stateName} housing market continues to be a focal point for regional economic health and investment potential. With a current state-wide median home value of ${valueStr}, ${stateName} has seen a ${yoyStr} shift in property values over the last year. This comprehensive overview analyzes data across all major ${stateName} metros—from urban hubs to suburban enclaves—to provide a clear picture of the state's residential real estate trajectory. As we move through ${currentYear}, the market in ${stateName} is showing signs of ${momentum}, influenced by local employment rates, migration patterns, and inventory availability that varies significantly by county.</p>

      <h3>What’s happening in ${stateName}</h3>
      <p>Across ${stateName}, the market is moving at ${yoyStr} year-over-year. While some pockets of the state are seeing rapid appreciation due to localized demand, others are beginning to stabilize after several years of historic growth. The current median value of ${valueStr} represents the latest snapshot in a dynamic environment where inventory levels and interest rates continue to play a pivotal role in shaping consumer behavior. We are seeing ${trendDirection} in major hubs, while secondary markets are offering a different value proposition for long-term investors looking for relative affordability.</p>

      <h3>Why it matters for Residents and Investors</h3>
      <p>Real estate is a primary driver of household wealth and economic stability in ${stateName}. A ${yoyStr} annual change impacts property tax revenues, consumer spending power, and the overall construction pipeline for new housing units. For residents, these shifts dictate whether the state is becoming more or less affordable relative to the national average, influencing migration patterns both into and out of ${stateName}. This data is critical for understanding the ${momentum} momentum of the regional economy and making informed decisions about buying or selling property in the current fiscal climate.</p>

      <h3>Market Outlook & Long-term Trends</h3>
      <p>Looking ahead, the ${stateName} housing market is expected to follow the trends established over the last ${dataYears} years of historical data. With values currently ${relativeToHigh} the all-time high of ${highStr}, ${stateName} remains a ${yoyChange !== undefined && yoyChange > 0 ? 'competitive' : 'steady'} region for real estate activity. Investors and homebuyers should monitor the ${momentum} trend as we progress through the year, paying close attention to how interest rate fluctuations might impact monthly payment affordability across different price points within the state.</p>
    `;

    const metroBody = `
      <p>The ${metroName} housing market is currently sitting around ${valueStr}, with prices ${upDown} ${absYoY}% compared to this time last year. This suggests the market is ${momentum}, depending on recent buyer demand and local economic conditions that define the ${metroName} metropolitan area. As a key regional economic center, the property value trends here serve as a bellwether for the surrounding counties.</p>

      <h3>Median Price Trend & YoY Change</h3>
      <p>The current median home value of ${valueStr} reflects a ${yoyStr} year-over-year change, a figure that highlights the current pace of the ${metroName} real estate market. This ${momentum} trend is a key indicator for the ${metroName} area's market health and overall desirability. Compared to the historical peak of ${highStr}, values are currently sitting ${relativeToHigh} that level. This ${absYoY}% annual shift provides a benchmark for local property appreciation and helps homeowners understand their equity position relative to the broader regional market.</p>

      <h3>Local Market Dynamics & Explanation</h3>
      <p>In ${metroName}, buyers and sellers are navigating a market defined by ${marketCondition}. The ${yoyStr} change over the past 12 months indicates that ${yoyChange !== undefined && yoyChange > 0 ? 'demand remains robust despite broader economic headwinds, with multiple offers still common for well-priced inventory' : 'the market is finding a new equilibrium after recent peaks, offering a potentially more favorable environment for patient buyers'}. For those looking to enter the ${metroName} real estate market, these historical trends offer vital context for long-term value retention and equity growth. Understanding whether the market is ${momentum} or stabilizing is the first step in formulating a winning strategy for any real estate transaction in the area.</p>
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
        body: stateSummary
      };
    }

    if (type === "metro" && metroName) {
      return {
        title: `${metroName} Housing Market ${currentYear} | Home Prices & Real Estate Trends`,
        description: `${metroName} housing data: median home price ${valueStr}, ${yoyStr} year-over-year change. Explore ${metroName} real estate trends and historical market data.`,
        heading: `Housing Market Snapshot: ${metroName}`,
        body: metroBody
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
