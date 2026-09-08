import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3107";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3107"], {
  env: { ...process.env, TWELVE_DATA_API_KEY: "", TWELVE_DATA_SYMBOL: "" }, stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
server.stdout.on("data", data => { logs += data; });
server.stderr.on("data", data => { logs += data; });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${logs}`);
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, "Production server must start");
  const html = await (await fetch(base)).text();
  assert.ok(html.includes("ATLAS"));
  assert.ok(html.includes("Natural Gas"));
  for (const interval of ["5min", "15min", "1h", "4h", "1day"]) {
    const response = await fetch(`${base}/api/market?interval=${interval}`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "MISSING_API_KEY");
  }
  const invalid = await fetch(`${base}/api/market?interval=bad`);
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_INTERVAL");
  const defaultInterval = await fetch(`${base}/api/market`);
  assert.equal(defaultInterval.status, 503);
  console.log("PASS: production page, default endpoint, all 5 intervals, invalid interval, missing-key response");
} finally {
  server.kill("SIGTERM");
}
