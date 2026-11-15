// Carries one CDP connection over stdin/stdout, one JSON message per line, so a client can reach
// the engine through `ezgh sandboxes exec -i` (a sandbox accepts no inbound connections).
// Logs go to stderr: stdout carries only CDP messages.

import { createInterface } from "node:readline";

const url = process.env.KITESURF_WS ?? "ws://127.0.0.1:8787/devtools/browser";

function open() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`cannot connect to ${url}`));
  });
}

// The engine may still be starting (first boot, or just after a resume): wait up to 60 s.
let ws;
for (let attempt = 0; !ws; attempt++) {
  try {
    ws = await open();
  } catch (error) {
    if (attempt >= 120) {
      console.error(error.message);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Re-serializing guarantees one message per line whatever whitespace the engine sends.
ws.onmessage = (event) => process.stdout.write(JSON.stringify(JSON.parse(event.data)) + "\n");
ws.onclose = () => process.exit(0);
createInterface({ input: process.stdin })
  .on("line", (line) => line && ws.send(line))
  .on("close", () => process.exit(0)); // the client hung up: don't wait on a busy engine
