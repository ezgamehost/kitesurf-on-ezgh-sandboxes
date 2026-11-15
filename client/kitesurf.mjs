// Connects Puppeteer to Kitesurf in an EZGH sandbox: the CDP connection runs over an interactive
// command (`ezgh sandboxes exec -i … -- node /app/bridge.mjs`), one JSON message per line.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import puppeteer from "puppeteer-core";

/** The command that runs the bridge in a sandbox, by name or ID. */
export function sandboxBridge(sandbox) {
  return ["ezgh", "sandboxes", "exec", "-i", sandbox, "--", "node", "/app/bridge.mjs"];
}

/** Connects through any command whose stdin/stdout reach the bridge, such as sandboxBridge(). */
export async function connect(command, options = {}) {
  const child = spawn(command[0], command.slice(1), { stdio: ["pipe", "pipe", "inherit"] });
  const transport = {
    onmessage: undefined,
    onclose: undefined,
    send: (message) => child.stdin.write(message + "\n"),
    close: () => child.stdin.end(),
  };
  createInterface({ input: child.stdout }).on("line", (line) => transport.onmessage?.(line));
  child.on("error", (error) => {
    console.error(`${command[0]}: ${error.message}`);
    transport.onclose?.();
  });
  child.on("exit", () => transport.onclose?.());
  return puppeteer.connect({ ...options, transport });
}
