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
  path.join(process.cwd(), "client", "dist");

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

  const dataPath = path.join(_dirname, "seo-data.json");
  if (fs.existsSync(dataPath)) {
    seoDataCache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    return seoDataCache!;
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
  /** Optional absolute URL to an OG image. */
  ogImage?: string;
  /** Optional JSON-LD payload as stringified JSON. */
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
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">

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

/**
 * In dev: load Vite client entry.
 * In prod: read Vite manifest.json to load hashed assets.
 */
function renderClientAssets(): string {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    return `<script type="module" src="/src/main.tsx"></script>`;
  }

  const manifestPath = path.join(CLIENT_DIST_DIR, ".vite", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    // Fallback (won't work if /src isn't served in prod)
    return `<script type="module" src="/src/main.tsx"></script>`;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, any>;
    const entryKey =
      Object.keys(manifest).find(k => k.endsWith("src/main.tsx")) ||
      Object.keys(manifest).find(k => k.includes("main.tsx")) ||
      Object.keys(manifest).find(k => manifest[k]?.isEntry);

    if (!entryKey) {
      return `<script type="module" src="/src/main.tsx"></script>`;
    }

    const entry = manifest[entryKey];
    const tags: string[] = [];

    // CSS for entry
    if (Array.isArray(entry.css)) {
      for (const cssFile of entry.css) {
        tags.push(`<link rel="stylesheet" crossorigin href="/${cssFile}">`);
      }
    }

    // Preload imports (optional)
    if (Array.isArray(entry.imports)) {
      for (const imp of entry.imports) {
        const chunk = manifest[imp];
        if (chunk?.file) {
          tags.push(`<link rel="modulepreload" crossorigin href="/${chunk.file}">`);
        }
        if (Array.isArray(chunk?.css)) {
          for (const cssFile of chunk.css) {
            tags.push(`<link rel="stylesheet" crossorigin href="/${cssFile}">`);
          }
        }
      }
    }

    // Main JS entry
    tags.push(`<script type="module" crossorigin src="/${entry.file}"></script>`);

    return tags.join("\n");
  } catch {
    return `<script type="module" src="/src/main.tsx"></script>`;
  }
}

function renderStyles(): string {
  // Lightweight fallback styles for SEO content; your SPA CSS will also load in prod.
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
    .positive { color: #059669; }
    .negative { color: #dc2626; }
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

function renderDocument(meta: SEOMeta, bodyInnerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(meta)}
${renderClientAssets()}
${renderStyles()}
</head>
<body>
  <div id="root">
    ${bodyInnerHtml}
  </div>
</body>
</html>`;
}

// Homepage SSR
export function renderHomepage(): string {
  const data = getSEOData();
  const { national, states } = data;

  const stateList = Object.values(states).sort((a, b) => a.name.localeCompare(b.name));

  const meta: SEOMeta = {
    title: "US Housing Market Statistics and Trends | Housing Intel",
    description: `Track US housing trends with a national median home value of ${formatCurrency(national.latestValue)} and ${formatPercent(national.yoyChange)} YoY. Explore ${national.totalStates} states and ${national.totalMetros}+ metros.`,
    canonical: BASE_URL,
  };

  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>

    <main>
      <h1>US Housing Market Statistics</h1>
      <p>Housing market data and trends across the United States: median home values, year-over-year change, and regional drilldowns.</p>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">National Median Home Value</div>
          <div class="stat-value">${formatCurrency(national.latestValue)}</div>
          <div class="stat-change ${national.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(national.yoyChange)} YoY</div>
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
      <p>Click a state to view median home values, YoY change, and metro breakdowns.</p>

      <ul class="link-grid">
        ${stateList.map(s => `<li><a href="/state/${s.slug}">${escapeHtml(s.name)}</a></li>`).join("")}
      </ul>

      <div class="faq">
        <h3>FAQ</h3>
        <div class="faq-item">
          <div class="faq-q">What is ZHVI?</div>
          <div class="faq-a">Zillow Home Value Index (ZHVI) estimates the typical home value in a region.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">What does YoY change mean?</div>
          <div class="faq-a">Year-over-year compares the latest value to the same month last year.</div>
        </div>
      </div>
    </main>

    ${renderFooter()}
  </div>`;

  return renderDocument(meta, body);
}

// States listing page
export function renderStatesPage(): string {
  const data = getSEOData();
  const stateList = Object.values(data.states).sort((a, b) => a.name.localeCompare(b.name));

  const meta: SEOMeta = {
    title: "Housing Market by State | Housing Intel",
    description: `Compare housing market stats across all US states: median home values and year-over-year price changes for ${stateList.length} states.`,
    canonical: `${BASE_URL}/states`,
  };

  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>

    <main>
      <div class="breadcrumb"><a href="/">Home</a> / States</div>
      <h1>Housing Market Statistics by State</h1>
      <p>State-level median home values, YoY change, and links to metro pages.</p>

      <ul class="link-list">
        ${stateList.map(s => `
          <li>
            <a href="/state/${s.slug}">${escapeHtml(s.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(s.latestValue)}
              <span class="${s.yoyChange >= 0 ? "positive" : "negative"}">(${formatPercent(s.yoyChange)})</span>
            </span>
          </li>
        `).join("")}
      </ul>
    </main>

    ${renderFooter()}
  </div>`;

  return renderDocument(meta, body);
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
    title: `${state.name} Housing Market Statistics | Housing Intel`,
    description: `${state.name} housing: median ${formatCurrency(state.latestValue)} (${formatPercent(state.yoyChange)} YoY). Explore ${metros.length} metros and historical trends.`,
    canonical: `${BASE_URL}/state/${slug}`,
  };

  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>

    <main>
      <div class="breadcrumb"><a href="/">Home</a> / <a href="/states">States</a> / ${escapeHtml(state.name)}</div>
      <h1>${escapeHtml(state.name)} Housing Market</h1>
      <p>Median home value, YoY change, and metro-level breakdowns for ${escapeHtml(state.name)}.</p>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Median Home Value</div>
          <div class="stat-value">${formatCurrency(state.latestValue)}</div>
          <div class="stat-change ${state.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(state.yoyChange)} YoY</div>
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

      ${metros.length ? `
      <h2>Metro Areas in ${escapeHtml(state.name)}</h2>
      <ul class="link-list">
        ${metros.slice(0, 50).map(m => `
          <li>
            <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(m.latestValue)}
              <span class="${m.yoyChange >= 0 ? "positive" : "negative"}">(${formatPercent(m.yoyChange)})</span>
            </span>
          </li>
        `).join("")}
      </ul>` : ``}

    </main>

    ${renderFooter()}
  </div>`;

  return renderDocument(meta, body);
}

// Metros listing page
export function renderMetrosPage(): string {
  const data = getSEOData();
  const total = Object.keys(data.metros).length;
  const metroList = Object.values(data.metros).sort((a, b) => b.latestValue - a.latestValue).slice(0, 200);

  const meta: SEOMeta = {
    title: "Housing Market by Metro Area | Housing Intel",
    description: `Compare housing stats across ${total}+ US metro areas: median home values and YoY change for major markets.`,
    canonical: `${BASE_URL}/metros`,
  };

  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>

    <main>
      <div class="breadcrumb"><a href="/">Home</a> / Metro Areas</div>
      <h1>Housing Market by Metro Area</h1>
      <p>Metro-level market stats for major US regions.</p>

      <ul class="link-list">
        ${metroList.map(m => `
          <li>
            <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(m.latestValue)}
              <span class="${m.yoyChange >= 0 ? "positive" : "negative"}">(${formatPercent(m.yoyChange)})</span>
            </span>
          </li>
        `).join("")}
      </ul>
    </main>

    ${renderFooter()}
  </div>`;

  return renderDocument(meta, body);
}

// Individual metro page
export function renderMetroPage(slug: string): string | null {
  const data = getSEOData();
  const metroName = data.metrosBySlug[slug];
  if (!metroName) return null;

  const metro = data.metros[metroName];
  if (!metro) return null;

  const state = data.states[metro.stateCode];

  const meta: SEOMeta = {
    title: `${metro.name} Housing Market Statistics | Housing Intel`,
    description: `${metro.name} housing: median ${formatCurrency(metro.latestValue)} (${formatPercent(metro.yoyChange)} YoY). View trends and compare to ${state ? state.name : "state"}.`,
    canonical: `${BASE_URL}/metro/${slug}`,
  };

  const relatedMetros = metro.relatedMetros.map(name => data.metros[name]).filter(Boolean);

  const body = `
  <div class="container">
    <header><a href="/">Housing Intel</a></header>

    <main>
      <div class="breadcrumb">
        <a href="/">Home</a> / <a href="/metros">Metro Areas</a>
        ${state ? ` / <a href="/state/${state.slug}">${escapeHtml(state.name)}</a>` : ``}
        / ${escapeHtml(metro.name)}
      </div>

      <h1>${escapeHtml(metro.name)} Housing Market</h1>
      <p>Median home value, YoY change, and related metros for ${escapeHtml(metro.name)}.</p>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Median Home Value</div>
          <div class="stat-value">${formatCurrency(metro.latestValue)}</div>
          <div class="stat-change ${metro.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(metro.yoyChange)} YoY</div>
        </div>
        ${state ? `
        <div class="stat-box">
          <div class="stat-label">${escapeHtml(state.name)} Median</div>
          <div class="stat-value">${formatCurrency(state.latestValue)}</div>
          <div class="stat-change ${state.yoyChange >= 0 ? "positive" : "negative"}">${formatPercent(state.yoyChange)} YoY</div>
        </div>` : ``}
        <div class="stat-box">
          <div class="stat-label">Data As Of</div>
          <div class="stat-value" style="font-size: 1.25rem;">${formatDate(metro.latestDate)}</div>
        </div>
      </div>

      ${relatedMetros.length ? `
      <h2>Related Metro Areas${state ? ` in ${escapeHtml(state.name)}` : ``}</h2>
      <ul class="link-list">
        ${relatedMetros.slice(0, 30).map(m => `
          <li>
            <a href="/metro/${m.slug}">${escapeHtml(m.name)}</a>
            <span style="color: var(--muted); margin-left: 12px;">
              ${formatCurrency(m.latestValue)}
              <span class="${m.yoyChange >= 0 ? "positive" : "negative"}">(${formatPercent(m.yoyChange)})</span>
            </span>
          </li>
        `).join("")}
      </ul>` : ``}

    </main>

    ${renderFooter()}
  </div>`;

  return renderDocument(meta, body);
}
