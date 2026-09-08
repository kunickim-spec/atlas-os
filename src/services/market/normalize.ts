import { Candle, Interval, MarketData } from "../../lib/market";

export class MarketError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MarketError("INVALID_DATA", "Dostawca zwrócił niepoprawną strukturę danych.");
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "" || !Number.isFinite(Number(value))) {
    throw new MarketError("INVALID_DATA", "Dostawca zwrócił niepoprawną wartość liczbową.");
  }
  return Number(value);
}
export function parseTime(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(value)) throw new MarketError("INVALID_DATA", "Niepoprawny czas świecy.");
  const iso = value.length === 10 ? `${value}T00:00:00Z` : `${value.replace(" ", "T")}Z`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== iso.slice(0, 19)) throw new MarketError("INVALID_DATA", "Niepoprawna data świecy.");
  return ms / 1000;
}
export type Instrument = { symbol: string; name: string; currency: string; type: string };
export function selectInstrument(payload: unknown, configured: string): Instrument {
  const data = record(payload).data;
  if (!Array.isArray(data)) throw new MarketError("INVALID_CATALOGUE", "Nie można odczytać katalogu surowców Twelve Data.");
  const candidates = data.map(record).filter(row => /natural\s+gas|henry\s+hub/i.test(String(row.name)) &&
    !/ETF|ETC|stock|equity/i.test(String(row.type ?? "")) &&
    (String(row.currency).toUpperCase() === "USD" || (row.currency == null && String(row.symbol).endsWith("/USD"))));
  const matches = configured ? candidates.filter(row => row.symbol === configured) : candidates;
  if (matches.length !== 1) throw new MarketError("INSTRUMENT_REQUIRED",
    configured ? "Skonfigurowany symbol nie odpowiada gazowi Natural Gas w USD w katalogu surowców Twelve Data." :
    "Nie znaleziono jednoznacznego instrumentu Natural Gas w USD. Sprawdź dostęp w Twelve Data i ustaw TWELVE_DATA_SYMBOL w .env.local.", 422);
  const row = matches[0];
  if (typeof row.symbol !== "string" || typeof row.name !== "string") throw new MarketError("INVALID_CATALOGUE", "Niepoprawne dane instrumentu.");
  return { symbol: row.symbol, name: row.name, currency: "USD", type: String(row.type ?? "Commodity") };
}
export function normalizeSeries(payload: unknown, instrument: Instrument, interval: Interval, now = Date.now()): MarketData {
  const root = record(payload);
  const meta = record(root.meta);
  if (meta.symbol !== instrument.symbol || (meta.currency && meta.currency !== "USD") ||
    (meta.interval && meta.interval !== interval) || (meta.type && /ETF|ETC|stock|equity/i.test(String(meta.type)))) {
    throw new MarketError("INSTRUMENT_MISMATCH", "Dostawca zwrócił inny instrument lub interwał niż zamówiony.");
  }
  // exchange_timezone describes the exchange, not necessarily the requested output timezone.
  if (interval !== "1day" && meta.timezone && meta.timezone !== "UTC") {
    throw new MarketError("TIMEZONE_MISMATCH", "Dostawca nie potwierdził zamówionej strefy UTC.");
  }
  if (!Array.isArray(root.values) || root.values.length === 0) throw new MarketError("NO_DATA", "Brak świec dla tego instrumentu i interwału.", 404);
  const byTime = new Map<number, Candle>();
  for (const item of root.values) {
    const row = record(item);
    const candle: Candle = { time: parseTime(row.datetime), open: number(row.open), high: number(row.high), low: number(row.low), close: number(row.close) };
    if (candle.time > now / 1000 + 60 || candle.low > Math.min(candle.open, candle.close) || candle.high < Math.max(candle.open, candle.close) || candle.low > candle.high) {
      throw new MarketError("INVALID_DATA", "Dostawca zwrócił niespójną świecę OHLC.");
    }
    if (row.volume !== undefined && row.volume !== null && row.volume !== "") {
      candle.volume = number(row.volume);
      if (candle.volume < 0) throw new MarketError("INVALID_DATA", "Niepoprawny wolumen.");
    }
    if (byTime.has(candle.time)) throw new MarketError("INVALID_DATA", "Dostawca zwrócił powtórzony czas świecy.");
    byTime.set(candle.time, candle);
  }
  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  const last = candles.at(-1)!;
  const previous = candles.at(-2);
  const change = previous ? last.close - previous.close : null;
  const count = candles.filter(c => c.volume !== undefined).length;
  return { ...instrument, instrumentType: instrument.type, interval, candles, source: "Twelve Data", delay: "unknown",
    fetchedAt: new Date(now).toISOString(), lastBarAt: new Date(last.time * 1000).toISOString(),
    price: last.close, change, changePercent: previous && previous.close !== 0 && change !== null ? change / previous.close * 100 : null,
    volume: count === 0 ? "unavailable" : count === candles.length ? "available" : "partial" };
}
