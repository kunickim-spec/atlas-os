export const INTERVALS = { "5min": "5m", "15min": "15m", "1h": "1H", "4h": "4H", "1day": "1D" } as const;
export type Interval = keyof typeof INTERVALS;
export const INTERVAL_SECONDS: Record<Interval, number> = { "5min": 300, "15min": 900, "1h": 3600, "4h": 14400, "1day": 86400 };
export function isInterval(value: string): value is Interval { return Object.hasOwn(INTERVALS, value); }
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type MarketData = {
  symbol: string; name: string; currency: string; instrumentType: string;
  interval: Interval; candles: Candle[]; fetchedAt: string; lastBarAt: string;
  source: "Twelve Data"; delay: "unknown"; volume: "available" | "partial" | "unavailable";
  price: number; change: number | null; changePercent: number | null;
};
export type MarketErrorBody = { error: { code: string; message: string } };
export function price(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
