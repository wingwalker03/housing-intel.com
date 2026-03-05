/**
 * Server-Side Rendering module for SEO pages.
 * Generates HTML with full SEO metadata and renders meaningful body content
 * inside <div id="root"> so the React client can hydrate/replace it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const _filename = typeof import.meta.url !== "undefined"
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== "undefined" ? __filename : "");
const _dirname = typeof __dirname !== "undefined"
  ? __dirname
  : (_filename ? path.dirname(_filename) : process.cwd());

const BASE_URL = process.env.SITE_BASE_URL || "https://housing-intel.com";

/** Where Vite outputs production assets. Override in prod if needed. */
const CLIENT_DIST_DIR =
  process.env.CLIENT_DIST_DIR ||
  path.join(process.cwd(), "dist", "public");

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

let seoDataCache: SEOData | null = null;

export function getSEOData(): SEOData {
  if (seoDataCache) return seoDataCache;

  const possiblePaths = [
    path.join(_dirname, "seo-data.json"),
    path.join(process.cwd(), "server", "seo-data.json"),
    path.join(process.cwd(), "dist", "seo-data.json"),
  ];

  for (const dataPath of possiblePaths) {
    if (fs.existsSync(dataPath)) {
      try {
        seoDataCache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
        console.log(`Loaded SEO data from ${dataPath}`);
        return seoDataCache!;
      } catch (err) {
        console.error(`Error parsing SEO data at ${dataPath}:`, err);
      }
    }
  }

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
  return String(text ?? "")
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
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface SEOMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: string;
}

function renderHead(meta: SEOMeta): string {
  const ogImage = meta.ogImage || `${BASE_URL}/og.png`;
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${meta.canonical}">
  <meta property="og:type" content="${escapeHtml(meta.ogType || "website")}">
  <meta property="og:site_name" content="Housing Intel">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" type="image/png" href="/favicon.png">
  ${meta.jsonLd ? `<script type="application/ld+json">${meta.jsonLd}</script>` : ""}
  `;
}

function renderClientAssets(): string {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    return `
    <script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/src/main.tsx"></script>`;
  }

  // In production, find the main JS file from dist/public/assets
  try {
    const distPublic = path.resolve(process.cwd(), "dist", "public", "assets");
    const distPublicAlt = path.resolve(process.cwd(), "server", "..", "dist", "public", "assets");
    const searchPath = fs.existsSync(distPublic) ? distPublic : (fs.existsSync(distPublicAlt) ? distPublicAlt : null);
    
    if (searchPath) {
      const files = fs.readdirSync(searchPath);
      const mainJs = files.find(f => f.startsWith("index-") && f.endsWith(".js"));
      const mainCss = files.find(f => f.startsWith("index-") && f.endsWith(".css"));
      
      let assets = "";
      if (mainCss) assets += `<link rel="stylesheet" href="/assets/${mainCss}">`;
      if (mainJs) assets += `<script type="module" src="/assets/${mainJs}"></script>`;
      return assets;
    }
  } catch (err) {
    console.error("Error reading production assets:", err);
  }
  
  // Final fallback if we are in prod but can't find hashed files (unlikely with correct distPath)
  return `<script type="module" src="/src/main.tsx"></script>`;
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
    p { margin-bottom: 16px; color: var(--muted); }
    .stat-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--text); }
    .stat-label { font-size: 0.875rem; color: var(--muted); }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .link-list { list-style: none; }
    .link-list li { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .link-list a { color: var(--primary); text-decoration: none; font-weight: 500; }
    .link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; list-style: none; }
    .link-grid li a { display: block; padding: 10px 14px; background: #f8f9fa; border-radius: 6px; color: var(--primary); text-decoration: none; font-size: 0.9rem; }
    .breadcrumb { font-size: 0.875rem; color: var(--muted); margin-bottom: 16px; }
    .breadcrumb a { color: var(--primary); text-decoration: none; }
    footer { margin-top: 48px; padding: 24px 0; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 0.875rem; }
  </style>
  `;
}

function renderFooter(): string {
  return `<footer><p>Housing Intel provides housing market data and analysis.</p></footer>`;
}

function renderDocument(meta: SEOMeta, bodyInnerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderClientAssets()}
${renderStyles()}
</head>
<body>
  <div id="root">${bodyInnerHtml}</div>
</body>
</html>`;
}

export function renderHomepage(): string {
  const data = getSEOData();
  const { national, states } = data;
  const stateList = Object.values(states).sort((a, b) => a.name.localeCompare(b.name));
  const meta: SEOMeta = {
    title: "US Housing Market Statistics and Trends | Housing Intel",
    description: `Track US housing trends with a national median home value of ${formatCurrency(national.latestValue)}.`,
    canonical: BASE_URL,
  };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <h1>US Housing Market Statistics</h1>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">National Median Home Value</div>
          <div class="stat-value">${formatCurrency(national.latestValue)}</div>
        </div>
      </div>

      <section style="margin: 32px 0; padding: 24px; background: #f8f9fa; border-radius: 8px; border: 1px solid var(--border);">
        <h2 style="margin-top: 0;">Data Methodology</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Source: Zillow ZHVI</h3>
            <p style="font-size: 0.8rem; color: var(--muted);">Representing typical home values in the 35th to 65th percentile range.</p>
          </div>
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 8px;">YoY Growth</h3>
            <p style="font-size: 0.8rem; color: var(--muted);">((Price_t - Price_t-12) / Price_t-12) * 100. Removes seasonal fluctuations.</p>
          </div>
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Update Cycle</h3>
            <p style="font-size: 0.8rem; color: var(--muted);">Synchronized monthly with official Zillow releases (approx. 15th of month).</p>
          </div>
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Limitations</h3>
            <p style="font-size: 0.8rem; color: var(--muted);">Uses a 3-month moving average of closed sales (30-60 day market lag).</p>
          </div>
        </div>
      </section>

      <h2>Housing Market by State</h2>
      <ul class="link-grid">
        ${stateList.map(s => `<li><a href="/state/${s.slug}">${escapeHtml(s.name)}</a></li>`).join("")}
      </ul>
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderStatesPage(): string {
  const data = getSEOData();
  const stateList = Object.values(data.states).sort((a, b) => a.name.localeCompare(b.name));
  const meta: SEOMeta = {
    title: "Housing Market by State | Housing Intel",
    description: `Compare housing market stats across all US states.`,
    canonical: `${BASE_URL}/states`,
  };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <div class="breadcrumb"><a href="/">Home</a> / States</div>
      <h1>Housing Market by State</h1>
      <ul class="link-list">
        ${stateList.map(s => `
          <li>
            <a href="/state/${s.slug}">${escapeHtml(s.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(s.latestValue)} 
            </span>
          </li>
        `).join("")}
      </ul>
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderStatePage(slug: string): string | null {
  const data = getSEOData();
  const stateCode = data.statesBySlug[slug];
  if (!stateCode) return null;
  const state = data.states[stateCode];
  
  const metros = state.metros
    .map(name => data.metros[name])
    .filter(Boolean)
    .sort((a, b) => b.latestValue - a.latestValue);

  const meta: SEOMeta = {
    title: `${state.name} Housing Trends | Housing Intel`,
    description: `Track ${state.name} housing prices.`,
    canonical: `${BASE_URL}/state/${slug}`,
  };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <div class="breadcrumb"><a href="/">Home</a> / <a href="/states">States</a> / ${escapeHtml(state.name)}</div>
      <h1>${escapeHtml(state.name)} Housing Market</h1>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Median Home Value</div>
          <div class="stat-value">${formatCurrency(state.latestValue)}</div>
          <div class="stat-change ${state.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(state.yoyChange)} YoY</div>
        </div>
      </div>
      <h2>Metro Areas in ${escapeHtml(state.name)}</h2>
      <ul class="link-list">
        ${metros.map(m => `
          <li>
            <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(m.latestValue)}
            </span>
          </li>
        `).join("")}
      </ul>
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderMetrosPage(): string {
  const data = getSEOData();
  const metroList = Object.values(data.metros).sort((a, b) => b.latestValue - a.latestValue).slice(0, 100);
  const meta: SEOMeta = { title: "Metro Housing Stats", description: "Top US metros", canonical: `${BASE_URL}/metros` };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <div class="breadcrumb"><a href="/">Home</a> / Metro Areas</div>
      <h1>Metropolitan Housing Market Stats</h1>
      <ul class="link-list">
        ${metroList.map(m => `
          <li>
            <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
          </li>
        `).join("")}
      </ul>
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderMetroPage(slug: string): string | null {
  const data = getSEOData();
  const metroName = data.metrosBySlug[slug];
  if (!metroName) return null;
  const metro = data.metros[metroName];
  const state = data.states[metro.stateCode];

  const meta: SEOMeta = { title: `${metro.name} Trends`, description: `View ${metro.name} stats`, canonical: `${BASE_URL}/metro/${slug}` };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <div class="breadcrumb"><a href="/">Home</a> / <a href="/metros">Metros</a> / ${escapeHtml(metro.name)}</div>
      <h1>${escapeHtml(metro.name)} Housing Market</h1>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Median Home Value</div>
          <div class="stat-value">${formatCurrency(metro.latestValue)}</div>
          <div class="stat-change ${metro.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(metro.yoyChange)} YoY</div>
        </div>
      </div>
      ${state ? `<p style="margin-top: 20px;">Return to <a href="/state/${state.slug}" style="color: var(--primary); text-decoration: none; font-weight: 600;">${state.name} State Overview</a></p>` : ""}
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderCrawlHubPage(): string {
  const data = getSEOData();
  const stateList = Object.values(data.states).sort((a, b) => a.name.localeCompare(b.name));
  const meta: SEOMeta = { title: "Crawl Hub", description: "Directory", canonical: `${BASE_URL}/crawl-hub` };
  const body = `<div class="container"><h1>Directory</h1><ul>${stateList.map(s => `<li><a href="/state/${s.slug}">${escapeHtml(s.name)}</a></li>`).join("")}</ul></div>`;
  return renderDocument(meta, body);
}

export function renderEmbedInfoPage(): string {
  const meta: SEOMeta = {
    title: "Housing Data Embeds & Widgets | Housing Intel",
    description: "Learn how to embed interactive housing market maps and charts.",
    canonical: `${BASE_URL}/embed-info`,
  };
  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>
    <main>
      <h1>Housing Market Embeds & Widgets</h1>
      <p>Enhance your content with real-time housing data visualizations.</p>
      <div class="stat-box">
        <h2>Why use our embeds?</h2>
        <ul style="list-style: disc; padding-left: 20px; color: var(--muted);">
          <li><strong>Real-time Updates:</strong> Data automatically stays current.</li>
          <li><strong>Interactive Design:</strong> Users can explore maps and charts.</li>
        </ul>
      </div>
      <h2>Web Widgets</h2>
      <p>Our responsive iframe widgets are perfect for real estate blogs and news sites.</p>
      <h2>Email Marketing</h2>
      <p>Include latest median home values directly in your newsletters using our static HTML API.</p>
      
      <hr style="margin: 40px 0; border: 0; border-top: 1px solid var(--border);" />
      
      <h2>Methodology</h2>
      <div style="margin-bottom: 24px;">
        <h3>Data Source: Zillow ZHVI</h3>
        <p>Data is powered by the Zillow Home Value Index (ZHVI), a smoothed, seasonally adjusted measure of the typical home value across US regions.</p>
      </div>
      <div style="margin-bottom: 24px;">
        <h3>YoY Calculation</h3>
        <p>Year-over-year change is calculated as: ((Price_current - Price_year_ago) / Price_year_ago) * 100. This removes seasonality for clearer long-term trends.</p>
      </div>
      <div style="margin-bottom: 24px;">
        <h3>Update Frequency</h3>
        <p>Our system updates monthly, synchronized with Zillow's data releases (typically around the 15th of each month).</p>
      </div>
      <div style="margin-bottom: 24px;">
        <h3>Limitations</h3>
        <p>ZHVI reflects a 3-month moving average of closed sales, which may result in a 30-60 day lag relative to real-time market sentiment.</p>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
  return renderDocument(meta, body);
}

export function renderSitemap(): string {
  const data = getSEOData();
  const lastmod = data.generatedAt.split("T")[0];
  const urls = [
    { loc: BASE_URL, priority: "1.0" },
    { loc: `${BASE_URL}/states`, priority: "0.8" },
    { loc: `${BASE_URL}/metros`, priority: "0.8" },
    { loc: `${BASE_URL}/crawl-hub`, priority: "0.7" },
    { loc: `${BASE_URL}/embed-info`, priority: "0.7" },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `<url><loc>${u.loc}</loc><lastmod>${lastmod}</lastmod><priority>${u.priority}</priority></url>`).join("")}
</urlset>`;
}
