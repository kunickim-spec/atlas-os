import { isInterval } from "@/lib/market";
import { getMarket } from "@/services/market/twelveData";
import { MarketError } from "@/services/market/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const interval = new URL(request.url).searchParams.get("interval") ?? "1h";
  const headers = { "Cache-Control": "no-store" };
  if (!isInterval(interval)) return Response.json({ error: { code: "INVALID_INTERVAL", message: "Dozwolone interwały: 5min, 15min, 1h, 4h, 1day." } }, { status: 400, headers });
  try { return Response.json(await getMarket(interval), { headers }); }
  catch (error) {
    const safe = error instanceof MarketError ? error : new MarketError("INTERNAL_ERROR", "Nie udało się pobrać danych rynkowych.", 500);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status,
      headers: { ...headers, ...(safe.status === 429 ? { "Retry-After": "60" } : {}) } });
  }
}
