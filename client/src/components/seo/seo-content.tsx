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

    if (type === "national") {
      return {
        title: `US Housing Market Overview ${currentYear} | Home Prices & Trends`,
        description: `Explore the US housing market with median home values at ${valueStr} and ${yoyStr} year-over-year growth. View historical trends, state comparisons, and metro area data.`,
        heading: `United States Housing Market Analysis ${currentYear}`,
        body: `
          <p>The United States housing market continues to be a critical indicator of economic health and a primary focus for homebuyers, investors, and policymakers alike. As of ${currentYear}, the national median home value stands at ${valueStr}, reflecting the ongoing dynamics of supply, demand, and broader economic factors that shape residential real estate across all 50 states.</p>
          
          <h3>Year-Over-Year Growth and Market Trends</h3>
          <p>The current year-over-year change in home values is ${yoyStr}, indicating ${trendDirection} in the housing sector. This metric is essential for understanding whether the market favors buyers or sellers and helps prospective homeowners time their purchases strategically. The historical high for national median home values reached ${highStr}, providing context for where current prices stand relative to peak valuations.</p>
          
          <h3>Regional Variations Across States</h3>
          <p>While national statistics provide a broad overview, the US housing market exhibits significant regional variation. Coastal states and major metropolitan areas often command premium prices, while midwestern and rural regions may offer more affordable options. Understanding these geographic differences is crucial for anyone considering a home purchase or real estate investment.</p>
          
          <h3>Historical Performance and Long-Term Outlook</h3>
          <p>Over the past ${dataYears} years, the US housing market has experienced cycles of growth, correction, and recovery. Factors such as interest rates, employment levels, population migration, and housing inventory continue to influence price trajectories. For long-term investors and homebuyers, analyzing these historical trends helps inform decisions about when and where to enter the market.</p>
          
          <h3>Using This Dashboard</h3>
          <p>This interactive housing market dashboard allows you to explore detailed data for individual states and metropolitan areas. Click on any state to view localized trends, or select a specific metro area to examine neighborhood-level housing statistics. Whether you're researching your first home purchase, considering relocation, or analyzing investment opportunities, our comprehensive data helps you make informed decisions about real estate in the United States.</p>
        `
      };
    }

    if (type === "state" && stateName) {
      const stateNameLower = stateName.toLowerCase();
      return {
        title: `${stateName} Housing Market ${currentYear} | Home Prices & Trends | ${stateCode}`,
        description: `${stateName} housing market data: median home value ${valueStr}, ${yoyStr} YoY change. Explore ${stateName} real estate trends, metro areas, and historical price data.`,
        heading: `${stateName} Housing Market Overview ${currentYear}`,
        body: `
          <p>The ${stateName} housing market represents a significant segment of the broader US real estate landscape. With a current median home value of ${valueStr}, ${stateName} offers distinct opportunities and challenges for homebuyers, sellers, and investors seeking to understand the ${stateNameLower} real estate environment.</p>
          
          <h3>Current Market Conditions in ${stateName}</h3>
          <p>${stateName} is currently experiencing a ${marketCondition}, with year-over-year home value changes of ${yoyStr}. This growth rate reflects the interplay of local economic conditions, population trends, and housing supply within the state. The historical peak for ${stateName} home values reached ${highStr}, providing important context for evaluating current price levels.</p>
          
          <h3>Metropolitan Areas in ${stateName}</h3>
          <p>Within ${stateName}, various metropolitan areas exhibit different price points and growth patterns. Urban centers typically command higher prices due to job opportunities, amenities, and infrastructure, while suburban and rural areas may offer more affordable housing options. Exploring individual metro areas provides granular insight into where value and growth potential may be concentrated.</p>
          
          <h3>Historical Trends and Price Evolution</h3>
          <p>Over the past ${dataYears} years, the ${stateName} housing market has demonstrated its own unique pattern of appreciation and adjustment. Analyzing this historical data helps identify long-term trends, seasonal patterns, and potential future price movements. Whether ${stateName} has outpaced or lagged national averages provides valuable context for investment and homebuying decisions.</p>
          
          <h3>Factors Influencing ${stateName} Real Estate</h3>
          <p>Multiple factors shape housing values in ${stateName}, including employment growth, population migration, new construction activity, and local economic policies. Understanding these drivers helps explain current conditions and anticipate future market directions. For those considering a move to ${stateName} or investing in ${stateNameLower} property, monitoring these indicators is essential for making well-informed decisions.</p>
          
          <h3>Explore ${stateName} Metro Areas</h3>
          <p>Use the interactive map and metro selector to drill down into specific cities and metropolitan statistical areas within ${stateName}. Each metro area page provides detailed pricing data, year-over-year trends, and historical charts to help you understand hyperlocal market conditions across ${stateNameLower}.</p>
        `
      };
    }

    if (type === "metro" && metroName && stateName) {
      const metroNameClean = metroName.replace(/, [A-Z]{2}(-[A-Z]{2})*$/, '');
      return {
        title: `${metroName} Housing Market ${currentYear} | Home Prices & Real Estate Trends`,
        description: `${metroName} housing data: median home price ${valueStr}, ${yoyStr} year-over-year change. Explore ${metroNameClean} real estate trends and historical market data.`,
        heading: `${metroName} Housing Market Analysis ${currentYear}`,
        body: `
          <p>The ${metroName} metropolitan area housing market offers a focused view of real estate conditions in this important ${stateName} region. With a current median home value of ${valueStr}, the ${metroNameClean} area presents specific opportunities for homebuyers and investors interested in this geographic market.</p>
          
          <h3>Current Market Performance</h3>
          <p>${metroName} is experiencing ${yoyStr} year-over-year change in home values, indicating a ${marketCondition}. This local growth rate may differ from both state and national averages, reflecting the unique economic and demographic factors that influence the ${metroNameClean} real estate market. The historical high for this metro area reached ${highStr}.</p>
          
          <h3>Local Economic Drivers</h3>
          <p>Housing values in the ${metroName} area are influenced by local employment centers, major employers, transportation infrastructure, and quality of life factors. Understanding these local drivers helps explain why home prices in ${metroNameClean} may be rising, stabilizing, or adjusting relative to surrounding areas and the broader ${stateName} market.</p>
          
          <h3>Historical Price Trends</h3>
          <p>Over the past ${dataYears} years, the ${metroName} housing market has established its own trajectory of price changes. Reviewing this historical data reveals patterns of growth, periods of correction, and overall market resilience. Long-term trend analysis is valuable for homebuyers planning extended stays and investors evaluating appreciation potential.</p>
          
          <h3>Neighborhood Considerations</h3>
          <p>Within the ${metroName} metropolitan statistical area, individual neighborhoods and suburbs may exhibit varying price points and growth rates. Factors such as school districts, commute times, local amenities, and development activity create micro-markets within the broader metro area. Prospective buyers should consider these localized factors when evaluating homes in ${metroNameClean}.</p>
          
          <h3>Making Informed Decisions</h3>
          <p>Whether you're considering purchasing a home in ${metroName}, selling existing property, or evaluating investment opportunities, understanding local market conditions is essential. This dashboard provides the historical context and current data needed to make informed real estate decisions in the ${metroNameClean} area and compare performance against other ${stateName} metro areas and national benchmarks.</p>
          
          <h3>Request Detailed Forecasts</h3>
          <p>For more detailed projections about where the ${metroName} housing market may be heading, sign up above to receive our exclusive 12-month forecast delivered directly to your inbox. Our analysis combines historical trends with current market indicators to provide actionable insights for your real estate planning.</p>
        `
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
