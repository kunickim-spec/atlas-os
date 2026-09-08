"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { INTERVALS, Interval, MarketData, MarketErrorBody, price } from "@/lib/market";
const LightweightChart = dynamic(() => import("./LightweightChart"), { ssr: false, loading: () => <div className="chart-canvas" /> });
const EMPTY: MarketData["candles"] = [];

export default function TradingChart({ data, interval, onInterval, loading, error, onRefresh }: {
  data: MarketData | null; interval: Interval; onInterval: (interval: Interval) => void;
  loading: boolean; error: MarketErrorBody["error"] | null; onRefresh: () => void;
}) {
  const [showVolume, setShowVolume] = useState(true);
  const [fitRequest, setFitRequest] = useState(0);
  const last = data?.candles.at(-1);
  const hasVolume = !!data && data.volume !== "unavailable";
  return <section className="panel chart-panel" aria-label="Wykres i interwały">
    <div className="chart-toolbar"><div className="intervals" role="group" aria-label="Interwał wykresu">
      {Object.entries(INTERVALS).map(([value, label]) => <button key={value} aria-pressed={interval === value} className={interval === value ? "selected" : ""} onClick={() => onInterval(value as Interval)}>{label}</button>)}
    </div><div className="chart-actions"><label className={!hasVolume ? "muted" : ""}><input type="checkbox" checked={showVolume} disabled={!hasVolume} onChange={event => setShowVolume(event.target.checked)} /> Volume</label>
      <button onClick={() => setFitRequest(n => n + 1)} disabled={!data}>Dopasuj</button></div></div>
    <div className="ohlc mono"><span>O <b>{price(last?.open)}</b></span><span>H <b>{price(last?.high)}</b></span><span>L <b>{price(last?.low)}</b></span><span>C <b>{price(last?.close)}</b></span><span className="ohlc-interval">{INTERVALS[interval]} / UTC</span></div>
    <div className="chart-wrap" aria-busy={loading}><LightweightChart candles={data?.candles ?? EMPTY} showVolume={showVolume && hasVolume} resetKey={`${data?.symbol ?? ""}:${interval}`} fitRequest={fitRequest} />
      {!data && <div className="chart-empty" role="status"><span className="empty-icon">NG</span><h2>{loading ? "Pobieranie świec…" : "Wykres czeka na dane"}</h2>
        <p>{loading ? "Łączenie z Twelve Data" : error?.message ?? "Połącz źródło danych, aby zobaczyć notowania Natural Gas."}</p>
        {!loading && <button className="primary-button" onClick={onRefresh}>Sprawdź połączenie</button>}
      </div>}
      {data && loading && <span className="chart-loading" role="status">Odświeżanie…</span>}
    </div>
    <div className="chart-footer"><span>{data ? `${data.candles.length} świec · ${data.source}` : "Bez danych testowych"}</span><span>{hasVolume ? data.volume === "partial" ? "Wolumen częściowy" : "Wolumen dostawcy" : "Wolumen niedostępny"}</span></div>
    <div className="attribution"><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a> · Copyright © 2025–2026 TradingView, Inc.</div>
  </section>;
}
