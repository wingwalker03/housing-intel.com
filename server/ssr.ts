/**
 * Server-Side Rendering module for SEO pages.
 * Generates static HTML with full SEO metadata that hydrates React client.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.SITE_BASE_URL || "https://housing-intel.com";

interface StateData {
  code: string;
  name: string;
  slug: string;
  latestValue: number;
  latestDate: string;
  yoyChange: number;
  metros: string[];
}

interface MetroData {
  name: string;
  slug: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  latestValue: number;
  latestDate: string;
  yoyChange: number;
  relatedMetros: string[];
}

interface SEOData {
  generatedAt: string;
  national: {
    latestValue: number;
    latestDate: string;
    yoyChange: number;
    totalStates: number;
    totalMetros: number;
  };
  states: Record<string, StateData>;
  metros: Record<string, MetroData>;
  statesBySlug: Record<string, string>;
  metrosBySlug: Record<string, string>;
}

// Cache the SEO data in memory
let seoDataCache: SEOData | null = null;

export function getSEOData(): SEOData {
  if (seoDataCache) return seoDataCache;
  
  const dataPath = path.join(__dirname, "seo-data.json");
  if (fs.existsSync(dataPath)) {
    seoDataCache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    return seoDataCache!;
  }
  
  // Return empty data if not built yet
  return {
    generatedAt: new Date().toISOString(),
    national: { latestValue: 0, latestDate: "", yoyChange: 0, totalStates: 0, totalMetros: 0 },
    states: {},
    metros: {},
    statesBySlug: {},
    metrosBySlug: {},
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface SEOMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
}

function renderHead(meta: SEOMeta): string {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${meta.canonical}">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:type" content="${meta.ogType || "website"}">
  <meta property="og:site_name" content="Housing Intel">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  
  <link rel="icon" type="image/png" href="/favicon.png">
  `;
}

function renderStyles(): string {
  return `
  <style>
    :root { --primary: #0066cc; --text: #1a1a1a; --muted: #666; --bg: #fff; --border: #e5e5e5; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: var(--text); background: var(--bg); }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { border-bottom: 1px solid var(--border); padding: 16px 0; margin-bottom: 32px; }
    header a { color: var(--primary); text-decoration: none; font-weight: 600; font-size: 1.25rem; }
    h1 { font-size: 2rem; margin-bottom: 16px; }
    h2 { font-size: 1.5rem; margin: 32px 0 16px; color: var(--text); }
    h3 { font-size: 1.25rem; margin: 24px 0 12px; }
    p { margin-bottom: 16px; color: var(--muted); }
    .stat-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--text); }
    .stat-label { font-size: 0.875rem; color: var(--muted); }
    .stat-change { font-size: 1rem; }
    .stat-change.positive { color: #059669; }
    .stat-change.negative { color: #dc2626; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .link-list { list-style: none; }
    .link-list li { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .link-list a { color: var(--primary); text-decoration: none; font-weight: 500; }
    .link-list a:hover { text-decoration: underline; }
    .link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; list-style: none; }
    .link-grid li a { display: block; padding: 10px 14px; background: #f8f9fa; border-radius: 6px; color: var(--primary); text-decoration: none; font-size: 0.9rem; }
    .link-grid li a:hover { background: #e9ecef; }
    .breadcrumb { font-size: 0.875rem; color: var(--muted); margin-bottom: 16px; }
    .breadcrumb a { color: var(--primary); text-decoration: none; }
    .faq { margin: 32px 0; }
    .faq-item { margin-bottom: 24px; }
    .faq-q { font-weight: 600; margin-bottom: 8px; }
    .faq-a { color: var(--muted); }
    footer { margin-top: 48px; padding: 24px 0; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 0.875rem; }
    .hydration-note { display: none; }
    @media (max-width: 640px) {
      h1 { font-size: 1.5rem; }
      .stat-value { font-size: 1.5rem; }
    }
  </style>
  `;
}

function renderFooter(): string {
  return `
  <footer>
    <p>Housing Intel provides housing market data and analysis.</p>
    <p>Data sourced from Zillow Home Value Index (ZHVI).</p>
  </footer>
  `;
}

function renderHydrationScript(): string {
  return `
  <div class="hydration-note" id="ssr-content">
    <!-- This content will be replaced by React hydration -->
  </div>
  <script type="module" src="/src/main.tsx"></script>
  `;
}

// Homepage SSR
export function renderHomepage(): string {
  const data = getSEOData();
  const { national, states } = data;
  
  const stateList = Object.values(states)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const meta: SEOMeta = {
    title: "US Housing Market Statistics and Trends | Housing Intel",
    description: `Track US housing market trends with median home values at ${formatCurrency(national.latestValue)} and ${formatPercent(national.yoyChange)} year over year change. Explore data for all ${national.totalStates} states and ${national.totalMetros}+ metro areas.`,
    canonical: BASE_URL,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderStyles()}
</head>
<body>
<div class="container">
  <header>
    <a href="/">Housing Intel</a>
  </header>
  
  <main>
    <h1>US Housing Market Statistics</h1>
    <p>Comprehensive housing market data and trends across the United States. Track median home values, year over year changes, and market conditions for states and metropolitan areas.</p>
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">National Median Home Value</div>
        <div class="stat-value">${formatCurrency(national.latestValue)}</div>
        <div class="stat-change ${national.yoyChange >= 0 ? 'positive' : 'negative'}">${formatPercent(national.yoyChange)} YoY</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">States Tracked</div>
        <div class="stat-value">${national.totalStates}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Metro Areas</div>
        <div class="stat-value">${national.totalMetros}+</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Data As Of</div>
        <div class="stat-value" style="font-size: 1.25rem;">${formatDate(national.latestDate)}</div>
      </div>
    </div>

    <h2>Housing Market by State</h2>
    <p>Explore detailed housing market data for each US state. Click on a state to view median home values, trends, and metropolitan area breakdowns.</p>
    
    <ul class="link-grid">
      ${stateList.map(s => `
        <li><a href="/state/${s.slug}">${escapeHtml(s.name)}</a></li>
      `).join('')}
    </ul>
    
    <h2>Understanding Housing Market Data</h2>
    <p>Our housing market statistics are based on the Zillow Home Value Index (ZHVI), which measures the typical home value in a given region. The year over year change indicates how home values have shifted compared to the same period last year.</p>
    
    <div class="faq">
      <h3>Frequently Asked Questions</h3>
      
      <div class="faq-item">
        <div class="faq-q">What is the median home value?</div>
        <div class="faq-a">The median home value represents the middle point of home values in a region, meaning half of homes are valued higher and half are valued lower. This provides a more accurate picture than averages, which can be skewed by extremely high or low values.</div>
      </div>
      
      <div class="faq-item">
        <div class="faq-q">How often is the data updated?</div>
        <div class="faq-a">Housing market data is updated monthly as new Zillow Home Value Index data becomes available, typically reflecting values from the previous month.</div>
      </div>
      
      <div class="faq-item">
        <div class="faq-q">What does year over year change mean?</div>
        <div class="faq-a">Year over year (YoY) change compares the current home value to the same month in the previous year, showing how the market has performed over a 12 month period.</div>
      </div>
    </div>
  </main>
  
  ${renderFooter()}
</div>
${renderHydrationScript()}
</body>
</html>`;
}

// States listing page
export function renderStatesPage(): string {
  const data = getSEOData();
  const stateList = Object.values(data.states)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const meta: SEOMeta = {
    title: "Housing Market by State | All 50 States | Housing Intel",
    description: `Compare housing market statistics across all US states. View median home values, price trends, and year over year changes for ${stateList.length} states and territories.`,
    canonical: `${BASE_URL}/states`,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderStyles()}
</head>
<body>
<div class="container">
  <header>
    <a href="/">Housing Intel</a>
  </header>
  
  <main>
    <div class="breadcrumb">
      <a href="/">Home</a> / States
    </div>
    
    <h1>Housing Market Statistics by State</h1>
    <p>Explore housing market data for all US states. Each state page includes median home values, historical trends, year over year changes, and links to metropolitan area data.</p>
    
    <ul class="link-list">
      ${stateList.map(s => `
        <li>
          <a href="/state/${s.slug}">${escapeHtml(s.name)}</a>
          <span style="color: var(--muted); margin-left: 12px;">
            ${formatCurrency(s.latestValue)} 
            <span class="${s.yoyChange >= 0 ? 'positive' : 'negative'}">(${formatPercent(s.yoyChange)})</span>
          </span>
        </li>
      `).join('')}
    </ul>
  </main>
  
  ${renderFooter()}
</div>
${renderHydrationScript()}
</body>
</html>`;
}

// Individual state page
export function renderStatePage(slug: string): string | null {
  const data = getSEOData();
  const stateCode = data.statesBySlug[slug];
  if (!stateCode) return null;
  
  const state = data.states[stateCode];
  if (!state) return null;
  
  const metros = state.metros
    .map(name => data.metros[name])
    .filter(Boolean)
    .sort((a, b) => b.latestValue - a.latestValue);
  
  const meta: SEOMeta = {
    title: `${state.name} Housing Market Statistics and Trends | Housing Intel`,
    description: `${state.name} housing market data: median home value ${formatCurrency(state.latestValue)} with ${formatPercent(state.yoyChange)} year over year change. Explore ${metros.length} metro areas and historical price trends.`,
    canonical: `${BASE_URL}/state/${slug}`,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderStyles()}
</head>
<body>
<div class="container">
  <header>
    <a href="/">Housing Intel</a>
  </header>
  
  <main>
    <div class="breadcrumb">
      <a href="/">Home</a> / <a href="/states">States</a> / ${escapeHtml(state.name)}
    </div>
    
    <h1>${escapeHtml(state.name)} Housing Market</h1>
    <p>Current housing market conditions and trends for ${escapeHtml(state.name)}. Data includes median home values, year over year price changes, and metropolitan area breakdowns.</p>
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Median Home Value</div>
        <div class="stat-value">${formatCurrency(state.latestValue)}</div>
        <div class="stat-change ${state.yoyChange >= 0 ? 'positive' : 'negative'}">${formatPercent(state.yoyChange)} YoY</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Metro Areas</div>
        <div class="stat-value">${metros.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Data As Of</div>
        <div class="stat-value" style="font-size: 1.25rem;">${formatDate(state.latestDate)}</div>
      </div>
    </div>

    <h2>${escapeHtml(state.name)} Housing Market Overview</h2>
    <p>The ${escapeHtml(state.name)} real estate market shows a median home value of ${formatCurrency(state.latestValue)}, representing a ${formatPercent(state.yoyChange)} change compared to the same time last year. This data is based on the Zillow Home Value Index and reflects typical home values across the state.</p>
    
    ${metros.length > 0 ? `
    <h2>Metropolitan Areas in ${escapeHtml(state.name)}</h2>
    <p>Explore housing market data for specific metro areas within ${escapeHtml(state.name)}. Each metro area has its own market dynamics influenced by local economic conditions, employment, and housing supply.</p>
    
    <ul class="link-list">
      ${metros.slice(0, 20).map(m => `
        <li>
          <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
          <span style="color: var(--muted); margin-left: 12px;">
            ${formatCurrency(m.latestValue)}
            <span class="${m.yoyChange >= 0 ? 'positive' : 'negative'}">(${formatPercent(m.yoyChange)})</span>
          </span>
        </li>
      `).join('')}
    </ul>
    ${metros.length > 20 ? `<p><a href="/metros?state=${state.code}">View all ${metros.length} metro areas</a></p>` : ''}
    ` : ''}
    
    <div class="faq">
      <h3>About ${escapeHtml(state.name)} Housing Market</h3>
      
      <div class="faq-item">
        <div class="faq-q">What factors influence ${escapeHtml(state.name)} home prices?</div>
        <div class="faq-a">Home prices in ${escapeHtml(state.name)} are influenced by local economic conditions, employment rates, population growth, housing supply and demand, interest rates, and regional amenities.</div>
      </div>
      
      <div class="faq-item">
        <div class="faq-q">How does ${escapeHtml(state.name)} compare to the national average?</div>
        <div class="faq-a">Compare the state median of ${formatCurrency(state.latestValue)} to the national median on our homepage to understand how ${escapeHtml(state.name)} fits within the broader US housing market.</div>
      </div>
    </div>
    
    <h3>Explore Other States</h3>
    <ul class="link-grid">
      ${Object.values(data.states)
        .filter(s => s.code !== state.code)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
        .map(s => `<li><a href="/state/${s.slug}">${escapeHtml(s.name)}</a></li>`)
        .join('')}
    </ul>
  </main>
  
  ${renderFooter()}
</div>
${renderHydrationScript()}
</body>
</html>`;
}

// Metros listing page
export function renderMetrosPage(): string {
  const data = getSEOData();
  const metroList = Object.values(data.metros)
    .sort((a, b) => b.latestValue - a.latestValue)
    .slice(0, 100);
  
  const meta: SEOMeta = {
    title: "Housing Market by Metro Area | Top US Cities | Housing Intel",
    description: `Compare housing market statistics across ${Object.keys(data.metros).length}+ US metropolitan areas. View median home values and price trends for major cities and regions.`,
    canonical: `${BASE_URL}/metros`,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderStyles()}
</head>
<body>
<div class="container">
  <header>
    <a href="/">Housing Intel</a>
  </header>
  
  <main>
    <div class="breadcrumb">
      <a href="/">Home</a> / Metro Areas
    </div>
    
    <h1>Housing Market by Metropolitan Area</h1>
    <p>Explore housing market data for US metropolitan areas. Metro areas often provide more granular insights into local real estate conditions than state level data.</p>
    
    <h2>Top Metro Areas by Home Value</h2>
    <ul class="link-list">
      ${metroList.map(m => `
        <li>
          <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
          <span style="color: var(--muted); margin-left: 12px;">
            ${formatCurrency(m.latestValue)}
            <span class="${m.yoyChange >= 0 ? 'positive' : 'negative'}">(${formatPercent(m.yoyChange)})</span>
          </span>
        </li>
      `).join('')}
    </ul>
    
    <h2>Browse by State</h2>
    <p>Select a state to view all metropolitan areas within that region.</p>
    <ul class="link-grid">
      ${Object.values(data.states)
        .filter(s => s.metros.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => `<li><a href="/state/${s.slug}">${escapeHtml(s.name)} (${s.metros.length})</a></li>`)
        .join('')}
    </ul>
  </main>
  
  ${renderFooter()}
</div>
${renderHydrationScript()}
</body>
</html>`;
}

// Individual metro page
export function renderMetroPage(slug: string): string | null {
  const data = getSEOData();
  const metroName = data.metrosBySlug[slug];
  if (!metroName) return null;
  
  const metro = data.metros[metroName];
  if (!metro) return null;
  
  const relatedMetros = metro.relatedMetros
    .map(name => data.metros[name])
    .filter(Boolean);
  
  const state = data.states[metro.stateCode];
  
  const meta: SEOMeta = {
    title: `${metro.name} Housing Market Statistics | Housing Intel`,
    description: `${metro.name} housing market: median home value ${formatCurrency(metro.latestValue)} with ${formatPercent(metro.yoyChange)} year over year change. View historical trends and market analysis.`,
    canonical: `${BASE_URL}/metro/${slug}`,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderStyles()}
</head>
<body>
<div class="container">
  <header>
    <a href="/">Housing Intel</a>
  </header>
  
  <main>
    <div class="breadcrumb">
      <a href="/">Home</a> / <a href="/metros">Metro Areas</a> / ${state ? `<a href="/state/${state.slug}">${escapeHtml(state.name)}</a> / ` : ''}${escapeHtml(metro.name)}
    </div>
    
    <h1>${escapeHtml(metro.name)} Housing Market</h1>
    <p>Current housing market conditions and price trends for the ${escapeHtml(metro.name)} metropolitan area${state ? ` in ${escapeHtml(state.name)}` : ''}.</p>
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Median Home Value</div>
        <div class="stat-value">${formatCurrency(metro.latestValue)}</div>
        <div class="stat-change ${metro.yoyChange >= 0 ? 'positive' : 'negative'}">${formatPercent(metro.yoyChange)} YoY</div>
      </div>
      ${state ? `
      <div class="stat-box">
        <div class="stat-label">State Median</div>
        <div class="stat-value">${formatCurrency(state.latestValue)}</div>
        <div class="stat-change ${state.yoyChange >= 0 ? 'positive' : 'negative'}">${formatPercent(state.yoyChange)} YoY</div>
      </div>
      ` : ''}
      <div class="stat-box">
        <div class="stat-label">Data As Of</div>
        <div class="stat-value" style="font-size: 1.25rem;">${formatDate(metro.latestDate)}</div>
      </div>
    </div>

    <h2>${escapeHtml(metro.name)} Market Overview</h2>
    <p>The ${escapeHtml(metro.name)} real estate market has a median home value of ${formatCurrency(metro.latestValue)}, which represents a ${formatPercent(metro.yoyChange)} change compared to last year. ${metro.yoyChange > 0 ? 'Home values have been increasing in this market.' : metro.yoyChange < 0 ? 'Home values have been declining in this market.' : 'Home values have remained relatively stable.'}</p>
    
    ${state ? `
    <h2>Compare to ${escapeHtml(state.name)} State</h2>
    <p>The ${escapeHtml(metro.name)} metro area ${metro.latestValue > state.latestValue ? 'has higher home values than' : metro.latestValue < state.latestValue ? 'has lower home values than' : 'is comparable to'} the ${escapeHtml(state.name)} state median of ${formatCurrency(state.latestValue)}. <a href="/state/${state.slug}">View all ${escapeHtml(state.name)} housing data</a>.</p>
    ` : ''}
    
    ${relatedMetros.length > 0 ? `
    <h2>Related Metro Areas${state ? ` in ${escapeHtml(state.name)}` : ''}</h2>
    <ul class="link-list">
      ${relatedMetros.map(m => `
        <li>
          <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
          <span style="color: var(--muted); margin-left: 12px;">
            ${formatCurrency(m.latestValue)}
            <span class="${m.yoyChange >= 0 ? 'positive' : 'negative'}">(${formatPercent(m.yoyChange)})</span>
          </span>
        </li>
      `).join('')}
    </ul>
    ` : ''}
    
    <div class="faq">
      <h3>About ${escapeHtml(metro.name)} Housing</h3>
      
      <div class="faq-item">
        <div class="faq-q">What is the typical home price in ${escapeHtml(metro.name)}?</div>
        <div class="faq-a">The median home value in ${escapeHtml(metro.name)} is ${formatCurrency(metro.latestValue)} as of ${formatDate(metro.latestDate)}. This represents the typical home value where half of homes are valued higher and half lower.</div>
      </div>
      
      <div class="faq-item">
        <div class="faq-q">Are home prices rising or falling in ${escapeHtml(metro.name)}?</div>
        <div class="faq-a">Home values have changed ${formatPercent(metro.yoyChange)} compared to the same time last year. ${metro.yoyChange > 2 ? 'This indicates a strong upward trend.' : metro.yoyChange < -2 ? 'This indicates a declining market.' : 'The market has been relatively stable.'}</div>
      </div>
    </div>
    
    <h3>Explore Other Metro Areas</h3>
    <ul class="link-grid">
      ${Object.values(data.metros)
        .filter(m => m.slug !== metro.slug)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
        .map(m => `<li><a href="/metro/${m.slug}">${escapeHtml(m.name)}</a></li>`)
        .join('')}
    </ul>
  </main>
  
  ${renderFooter()}
</div>
${renderHydrationScript()}
</body>
</html>`;
}
