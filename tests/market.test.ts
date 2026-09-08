import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeries, selectInstrument, parseTime, MarketError } from "../src/services/market/normalize";
import { createMarketService } from "../src/services/market/twelveData";
import { GET } from "../src/app/api/market/route";

// Fictional instrument and candles: test fixtures only, never bundled into the UI.
const instrument = { symbol: "TEST-GAS/USD", name: "Natural Gas Test Fixture", currency: "USD", type: "Commodity" };
const now = Date.parse("2026-01-05T12:02:00Z");
const row = { datetime: "2026-01-05 12:00:00", open: "3.000", high: "3.200", low: "2.900", close: "3.100" };
const payload = (values: unknown[]) => ({ meta: { symbol: instrument.symbol, currency: "USD", interval: "1h" }, values });
const catalogue = { data: [instrument] };

test("sort candles, preserve missing volume and calculate bar change", () => {
  const result = normalizeSeries(payload([row, { ...row, datetime: "2026-01-05 11:00:00", close: "3.000", volume: "0" }]), instrument, "1h", now);
  assert.ok(result.candles[0].time < result.candles[1].time);
  assert.equal(result.candles[0].volume, 0);
  assert.equal(result.candles[1].volume, undefined);
  assert.equal(result.volume, "partial");
  assert.ok(Math.abs(result.changePercent! - 100 / 30) < 1e-9);
  assert.equal(result.delay, "unknown");
});
test("UTC times and daily dates are independent of host timezone", () => {
  assert.equal(parseTime("2026-01-05 12:00:00"), Date.parse("2026-01-05T12:00:00Z") / 1000);
  assert.equal(parseTime("2026-01-05"), Date.parse("2026-01-05T00:00:00Z") / 1000);
  assert.throws(() => parseTime("2026-02-30"), MarketError);
});
test("reject corrupt, duplicate and empty candles", () => {
  for (const bad of [{ close: "NaN" }, { open: null }, { low: "3.15" }, { high: "2.80" }, { volume: "-1" }, { close: "" }, { datetime: "2028-01-01" }]) {
    assert.throws(() => normalizeSeries(payload([{ ...row, ...bad }]), instrument, "1h", now), MarketError);
  }
  assert.throws(() => normalizeSeries(payload([row, row]), instrument, "1h", now), MarketError);
  assert.throws(() => normalizeSeries(payload([]), instrument, "1h", now), MarketError);
});
test("reject wrong instruments, currency, and interval", () => {
  for (const meta of [{ symbol: "AAPL" }, { type: "ETF" }, { currency: "EUR" }, { interval: "5min" }]) {
    assert.throws(() => normalizeSeries({ ...payload([row]), meta: { ...payload([]).meta, ...meta } }, instrument, "1h", now), MarketError);
  }
});
test("catalogue selection does not substitute ETF, stock, or ambiguous symbol", () => {
  assert.equal(selectInstrument(catalogue, "").symbol, instrument.symbol);
  assert.equal(selectInstrument({ data: [{ symbol: "TEST-GAS/USD", name: "Natural Gas", category: "Energy Resource" }] }, "").symbol, instrument.symbol);
  assert.throws(() => selectInstrument({ data: [{ ...instrument, type: "ETF" }] }, ""), MarketError);
  assert.throws(() => selectInstrument({ data: [{ ...instrument, name: "National Grid" }] }, ""), MarketError);
  assert.throws(() => selectInstrument({ data: [instrument, { ...instrument, symbol: "OTHER-GAS/USD" }] }, ""), MarketError);
  assert.throws(() => selectInstrument(catalogue, "NG"), MarketError);
  assert.throws(() => selectInstrument({ data: [] }, ""), MarketError);
});
test("coalesce requests and cache per interval without further credit use", async () => {
  let calls = 0; let clock = now;
  const fetcher: typeof fetch = async (input) => {
    calls++; const url = new URL(String(input));
    assert.equal(url.hostname, "api.twelvedata.com");
    return Response.json(url.pathname === "/commodities" ? catalogue : payload([row]));
  };
  const service = createMarketService({ apiKey: "TEST_KEY", fetcher, now: () => clock });
  const [a, b] = await Promise.all([service.getMarket("1h"), service.getMarket("1h")]);
  assert.deepEqual(a, b); assert.equal(calls, 2);
  await service.getMarket("1h"); assert.equal(calls, 2);
  clock += 61_000;
  await service.getMarket("1h"); assert.equal(calls, 3);
});
test("missing key makes no outbound request", async () => {
  const service = createMarketService({ apiKey: "", fetcher: async () => { throw Error("must not fetch"); } });
  await assert.rejects(service.getMarket("1h"), { code: "MISSING_API_KEY", status: 503 });
});
test("HTTP 200 provider errors are sanitized and cooldown stops repeat calls", async () => {
  let calls = 0;
  const service = createMarketService({ apiKey: "SECRET_FIXTURE", now: () => now, fetcher: async () => {
    calls++; return Response.json({ status: "error", code: 429, message: "SECRET_FIXTURE" });
  } });
  await assert.rejects(service.getMarket("1h"), (error: unknown) => {
    assert.ok(error instanceof MarketError); assert.equal(error.status, 429); assert.ok(!error.message.includes("SECRET_FIXTURE")); return true;
  });
  await assert.rejects(service.getMarket("5min"), { code: "RATE_LIMIT" });
  assert.equal(calls, 1);
});
test("network errors and non-JSON responses become safe API errors", async () => {
  const offline = createMarketService({ apiKey: "fixture", fetcher: async () => { throw Error("sensitive URL"); } });
  await assert.rejects(offline.getMarket("1h"), { code: "PROVIDER_UNAVAILABLE" });
  const invalid = createMarketService({ apiKey: "fixture", fetcher: async () => new Response("<html>error</html>") });
  await assert.rejects(invalid.getMarket("1h"), { code: "INVALID_RESPONSE" });
});
test("API rejects unsupported interval and prototype property names", async () => {
  for (const interval of ["1min", "__proto__", "constructor"]) {
    const response = await GET(new Request(`http://localhost/api/market?interval=${interval}`));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_INTERVAL");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
