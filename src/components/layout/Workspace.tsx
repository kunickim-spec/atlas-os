"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./Header";
import Menu from "./Menu";
import TradingChart from "@/components/charts/TradingChart";
import WeatherPanel from "@/components/weather/WeatherPanel";
import { INTERVALS, INTERVAL_SECONDS, Interval, MarketData, MarketErrorBody, price } from "@/lib/market";

const stamp = (value?: string) => value ? new Date(value).toLocaleString("pl-PL", { timeZone: "UTC", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
export default function Workspace() {
  const [interval, setIntervalValue] = useState<Interval>("1h");
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<MarketErrorBody["error"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  const refresh = useCallback(async (selected: Interval) => {
    controller.current?.abort();
    const current = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30_000);
    setLoading(true);
    try {
      const response = await fetch(`/api/market?interval=${selected}`, { signal: abort.signal, cache: "no-store" });
      const body = await response.json();
      if (current !== sequence.current) return;
      if (!response.ok) {
        setError(body.error ?? { code: "HTTP_ERROR", message: "Nie udało się pobrać danych." });
        setAuto(false);
        return;
      }
      if (body.interval !== selected || !Array.isArray(body.candles) || !body.candles.length) throw new Error("Invalid response");
      setData(body); setError(null); setNow(Date.now());
    } catch {
      if (current !== sequence.current) return;
      setError({ code: "CONNECTION_ERROR", message: "Nie udało się połączyć z serwerem. Sprawdź, czy aplikacja działa, i spróbuj ponownie." });
      setAuto(false);
    } finally { clearTimeout(timeout); if (current === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh(interval);
    return () => { sequence.current++; controller.current?.abort(); };
  }, [interval, retry, refresh]);
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => { if (!document.hidden) void refresh(interval); }, 60_000);
    return () => clearInterval(timer);
  }, [auto, interval, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(timer); }, []);
  function changeInterval(next: Interval) {
    if (next === interval) return;
    sequence.current++; controller.current?.abort();
    setData(null); setError(null); setLoading(true); setIntervalValue(next);
  }
  const stale = !!data && now > Date.parse(data.lastBarAt) + (INTERVAL_SECONDS[interval] + 120) * 1000;
  const disconnected = !!error;
  const latest = data?.candles.at(-1);
  const changeClass = data?.change == null || disconnected || stale ? "" : data.change >= 0 ? "positive" : "negative";
  const status = loading ? "ŁĄCZENIE" : !data ? "BRAK DANYCH" : disconnected ? "BŁĄD POŁĄCZENIA" : stale ? "STARSZA ŚWIECA" : "DANE POBRANE";
  return <><Header /><div className="app-shell"><Menu /><main id="terminal">
    <div className="workspace-heading"><div><p className="eyebrow">TERMINAL / ENERGY</p><h1>Natural Gas <span>Workspace</span></h1></div>
      <div className="refresh-controls"><label><input type="checkbox" checked={auto} disabled={!data || !!error} onChange={event => setAuto(event.target.checked)} /> Auto · 60 s</label>
        <button className="outline-button" disabled={loading} onClick={() => setRetry(n => n + 1)}>{loading ? "Łączenie…" : "Odśwież"}</button></div></div>
    <section className="instrument-strip" aria-label="Notowania instrumentu"><div className="instrument-name"><span className="instrument-icon">NG</span><div><h2>{data?.name ?? "Natural Gas"}</h2><p>{data ? `${data.symbol} · ${data.instrumentType} · Twelve Data` : "Instrument oczekuje na weryfikację"}</p></div></div>
      <div className="quote"><strong className="mono">{price(data?.price)}</strong><span>{data?.currency ?? "USD"} · ostatnie C</span></div>
      <div className={`quote-change ${changeClass}`}><strong className="mono">{data?.changePercent == null ? "—" : `${data.changePercent > 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`}</strong><span>vs poprzednia świeca {INTERVALS[interval]}</span></div>
      <span className={`badge status ${data && !error && !stale ? "received" : ""}`} role="status">{status}</span></section>
    <div className="terminal-grid"><div className="market-column">
      {error && <div className="connection-alert" role="alert"><strong>{error.code === "MISSING_API_KEY" ? "Połącz źródło danych" : "Dane rynkowe niedostępne"}</strong><p>{error.message}</p>{data && <p>Wykres i cena pokazują ostatnio pobrane dane, nie bieżący rynek.</p>}</div>}
      <TradingChart data={data} interval={interval} onInterval={changeInterval} loading={loading} error={error} onRefresh={() => setRetry(n => n + 1)} />
      <section className="panel data-panel"><div className="panel-title"><h2>Jakość danych</h2><span className="eyebrow">SOURCE CHECK</span></div>
        <dl className="data-grid"><div><dt>Pobrano · UTC</dt><dd className="mono">{stamp(data?.fetchedAt)}</dd></div><div><dt>Początek ostatniej świecy · UTC</dt><dd className="mono">{stamp(data?.lastBarAt)}</dd></div><div><dt>Opóźnienie notowań</dt><dd>Niepotwierdzone</dd></div><div><dt>Ostatni wolumen</dt><dd className="mono">{latest?.volume?.toLocaleString("pl-PL") ?? "Niedostępny"}</dd></div></dl>
        <p className="panel-note">Pobrane świece nie potwierdzają transmisji w czasie rzeczywistym. Status LIVE pozostaje wyłączony. Kontrakt, termin wygaśnięcia i zgodność z Henry Hub wymagają potwierdzenia u dostawcy.</p></section>
    </div><aside className="context-column"><WeatherPanel />
      <section className="panel score-panel" id="market-score"><div className="panel-title"><h2>Market Score</h2><span className="badge">NIEAKTYWNY</span></div><div className="score-value"><strong>—</strong><span>/ 100</span></div><p className="muted">Brak oceny kierunku rynku</p><div className="score-track" /><div className="score-labels"><span>Bearish</span><span>Neutral</span><span>Bullish</span></div><p className="panel-note">Ocena będzie dostępna po podłączeniu i zweryfikowaniu danych fundamentalnych.</p></section>
      <section className="panel analyst-panel" id="analyst"><div className="panel-title"><h2><span className="ai-mark">AI</span> ATLAS Analyst</h2><span className="badge">NIEAKTYWNY</span></div><h3>Najpierw dane.<br />Potem wnioski.</h3><p className="muted">Analityk będzie łączyć cenę, pogodę, zapasy i przepływy gazu. Model AI nie jest jeszcze podłączony.</p><div className="analyst-source"><span>Dane cenowe</span><span>{data && !error ? "Pobrane" : "Oczekują"}</span></div><div className="analyst-source"><span>Pogoda · EIA · LNG</span><span>Niepodłączone</span></div></section>
    </aside></div><footer className="workspace-footer"><span>ATLAS OS <span className="muted">/ Natural Gas Research Terminal</span></span><span>Źródło cen: Twelve Data · czas wykresu UTC</span></footer>
  </main></div></>;
}
