"use client";
import { useEffect, useRef } from "react";
import { CandlestickSeries, HistogramSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { chartConfig } from "@/lib/chartConfig";
import { Candle } from "@/lib/market";

export default function LightweightChart({ candles, showVolume, resetKey, fitRequest }: { candles: Candle[]; showVolume: boolean; resetKey: string; fitRequest: number }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, chartConfig);
    chart.current = instance;
    series.current = instance.addSeries(CandlestickSeries, { upColor: "#31d2a0", downColor: "#f07886", borderVisible: false, wickUpColor: "#31d2a0", wickDownColor: "#f07886", priceFormat: { type: "price", precision: 3, minMove: 0.001 } });
    volume.current = instance.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false });
    volume.current.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    first.current = true;
    return () => { instance.remove(); chart.current = null; series.current = null; volume.current = null; };
  }, []);
  useEffect(() => { first.current = true; }, [resetKey]);
  useEffect(() => {
    if (!chart.current || !series.current || !volume.current) return;
    const visible = chart.current.timeScale().getVisibleLogicalRange();
    series.current.setData(candles.map(({ volume: unused, ...candle }) => ({ ...candle, time: candle.time as UTCTimestamp })));
    volume.current.setData(candles.filter(c => c.volume !== undefined).map(c => ({ time: c.time as UTCTimestamp, value: c.volume!, color: c.close >= c.open ? "#218d7055" : "#b44d6055" })));
    if (candles.length && first.current) { chart.current.timeScale().fitContent(); first.current = false; }
    else if (visible) chart.current.timeScale().setVisibleLogicalRange(visible);
  }, [candles, resetKey]);
  useEffect(() => {
    volume.current?.applyOptions({ visible: showVolume });
    chart.current?.priceScale("right").applyOptions({ scaleMargins: { top: 0.12, bottom: showVolume ? 0.27 : 0.08 } });
  }, [showVolume]);
  useEffect(() => { if (fitRequest) chart.current?.timeScale().fitContent(); }, [fitRequest]);
  return <div className="chart-canvas" ref={container} role="img" aria-label="Wykres świecowy Natural Gas. Czas UTC. Przybliżanie kółkiem myszy, przesuwanie przez przeciągnięcie." />;
}
