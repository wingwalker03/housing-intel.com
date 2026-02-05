import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "csv-parse",
  "d3-scale",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "p-limit",
  "p-retry",
  "passport",
  "passport-local",
  "pg",
  "sanitize-html",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
    banner: {
      js: `import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import { dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);`,
    },
  });

  // Create a CJS wrapper for deployment compatibility
  // Uses dynamic import() which works in both CJS and ESM contexts
  const cjsWrapper = `// CJS wrapper that loads ESM module
(async () => {
  try {
    await import('./index.mjs');
  } catch (err) {
    console.error('Failed to load ESM module:', err);
    process.exit(1);
  }
})();
`;
  await writeFile("dist/index.cjs", cjsWrapper);
  console.log("created CJS wrapper at dist/index.cjs");

  // Copy seo-data.json to dist for production SSR
  const seoDataPath = path.resolve(process.cwd(), "server", "seo-data.json");
  if (fs.existsSync(seoDataPath)) {
    await fs.promises.copyFile(seoDataPath, path.resolve(process.cwd(), "dist", "seo-data.json"));
    console.log("copied server/seo-data.json to dist/");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
