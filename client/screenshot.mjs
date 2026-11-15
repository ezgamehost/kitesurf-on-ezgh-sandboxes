// node screenshot.mjs <sandbox> [url] [out.png]
// KITESURF_BRIDGE overrides how the bridge is reached, e.g. "docker exec -i kitesurf" in CI.

import { connect, sandboxBridge } from "./kitesurf.mjs";

const [sandbox, url = "https://example.com/", out = "page.png"] = process.argv.slice(2);
if (!sandbox && !process.env.KITESURF_BRIDGE) {
  console.error("usage: node screenshot.mjs <sandbox> [url] [out.png]");
  process.exit(2);
}
const command = process.env.KITESURF_BRIDGE
  ? [...process.env.KITESURF_BRIDGE.split(" "), "node", "/app/bridge.mjs"]
  : sandboxBridge(sandbox);

const browser = await connect(command);
const page = await browser.newPage();
await page.goto(url);
await page.screenshot({ path: out });
console.log(`${await page.title()} -> ${out}`);
await browser.disconnect();
