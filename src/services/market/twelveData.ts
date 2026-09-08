import { Interval, MarketData } from "../../lib/market";
import { Instrument, MarketError, normalizeSeries, selectInstrument } from "./normalize";

const CACHE_MS = 60_000;
type Options = { apiKey?: string; symbol?: string; fetcher?: typeof fetch; now?: () => number };
export function createMarketService({ apiKey, symbol = "", fetcher = fetch, now = Date.now }: Options) {
  const cache = new Map<Interval, { at: number; data: MarketData }>();
  const pending = new Map<Interval, Promise<MarketData>>();
  let instrument: Instrument | undefined;
  let cataloguePending: Promise<Instrument> | undefined;
  let blockedUntil = 0;
  let lastError: MarketError | undefined;

  async function request(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(`https://api.twelvedata.com/${path}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    url.searchParams.set("apikey", apiKey!.trim());
    let response: Response;
    try {
      response = await fetcher(url, { signal: AbortSignal.timeout(12_000), cache: "no-store", redirect: "error" });
    } catch {
      throw new MarketError("PROVIDER_UNAVAILABLE", "Nie można połączyć się z Twelve Data. Spróbuj ponownie za minutę.", 503);
    }
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new MarketError("INVALID_RESPONSE", "Twelve Data nie zwróciło poprawnego JSON."); }
    const data = payload as { status?: string; code?: number } | null;
    if (!response.ok || data?.status === "error") {
      const code = Number(data?.code ?? response.status);
      if (code === 429) throw new MarketError("RATE_LIMIT", "Limit Twelve Data został wyczerpany. Automatyczne odświeżanie wstrzymane; sprawdź limit konta.", 429);
      if (code === 401) throw new MarketError("INVALID_API_KEY", "Twelve Data odrzuciło klucz API. Sprawdź .env.local.", 503);
      if (code === 403) throw new MarketError("PLAN_REQUIRED", "Twój plan Twelve Data nie udostępnia tych danych. Sprawdź uprawnienia do surowców.", 403);
      if (code === 400 || code === 404) throw new MarketError("NO_DATA", "Twelve Data nie udostępnia danych dla tego symbolu lub interwału.", 404);
      throw new MarketError("PROVIDER_ERROR", "Błąd dostawcy danych. Spróbuj ponownie za minutę.");
    }
    return payload;
  }
  async function resolveInstrument() {
    if (instrument) return instrument;
    if (!cataloguePending) cataloguePending = request("commodities").then(data => {
      instrument = selectInstrument(data, symbol.trim());
      return instrument;
    }).finally(() => { cataloguePending = undefined; });
    return cataloguePending;
  }
  async function getMarket(interval: Interval): Promise<MarketData> {
    if (!apiKey?.trim()) throw new MarketError("MISSING_API_KEY", "Dodaj TWELVE_DATA_API_KEY do .env.local i uruchom ponownie serwer.", 503);
    const cached = cache.get(interval);
    if (cached && now() - cached.at < CACHE_MS) return cached.data;
    if (now() < blockedUntil && lastError) throw lastError;
    const existing = pending.get(interval);
    if (existing) return existing;
    const task = (async () => {
      try {
        const selected = await resolveInstrument();
        const raw = await request("time_series", { symbol: selected.symbol, interval, outputsize: "300", timezone: "UTC", order: "asc", format: "JSON" });
        const data = normalizeSeries(raw, selected, interval, now());
        cache.set(interval, { at: now(), data });
        return data;
      } catch (error) {
        const safe = error instanceof MarketError ? error : new MarketError("PROVIDER_ERROR", "Nie udało się pobrać danych.");
        // A shared cooldown also prevents repeated interval clicks consuming credits on errors.
        lastError = safe;
        blockedUntil = now() + CACHE_MS;
        throw safe;
      } finally { pending.delete(interval); }
    })();
    pending.set(interval, task);
    return task;
  }
  return { getMarket };
}

const service = createMarketService({ apiKey: process.env.TWELVE_DATA_API_KEY, symbol: process.env.TWELVE_DATA_SYMBOL });
export const getMarket = service.getMarket;
