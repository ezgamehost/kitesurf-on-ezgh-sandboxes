// Serves Kitesurf's built engine with Miniflare (workerd) on 127.0.0.1:8787.
// Adapted from Kitesurf's scripts/wpt-engine.mjs `serve` (Apache-2.0, Cloudflare, Inc.).

import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  Miniflare,
  compileModuleRules,
  convertV4MiniflareOptions,
  testRegExps,
} from "miniflare";

const DIST = resolve(import.meta.dirname, "dist");
const ASSETS = resolve(import.meta.dirname, "public");
const PORT = Number(process.env.KITESURF_PORT ?? 8787);

const RULES = compileModuleRules([
  { type: "CompiledWasm", include: ["**/*.wasm"] },
  { type: "Text", include: ["**/*.glue.js", "*.css", "**/*.css", "**/*.dat"] },
  { type: "Data", include: ["**/*.woff2", "**/*.bin"] },
]);

function modules() {
  const list = [{ type: "ESModule", path: resolve(DIST, "index.js") }];
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, item.name);
      if (item.isDirectory()) walk(full);
      else {
        const name = relative(DIST, full);
        const rule = name !== "index.js" && RULES.find((r) => testRegExps(r.include, name));
        if (rule) list.push({ type: rule.type, path: full });
      }
    }
  };
  walk(DIST);
  return list;
}

// engine-mf.json is the Worker's options as `wrangler deploy --dry-run` resolved them at build time.
const options = JSON.parse(readFileSync(resolve(DIST, "engine-mf.json"), "utf8"));
const miniflare = new Miniflare(
  convertV4MiniflareOptions({
    host: "127.0.0.1", // loopback only: the bridge is the one way in
    port: PORT,
    cf: false,
    workers: [
      {
        ...options,
        name: "kitesurf-engine",
        modulesRoot: DIST,
        modules: modules(),
        assets: options.assets && { ...options.assets, directory: ASSETS },
      },
    ],
  }),
);
console.log(`kitesurf ready on ${(await miniflare.ready).href}`);

const stop = async () => {
  await miniflare.dispose().catch(() => {});
  process.exit(0);
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
