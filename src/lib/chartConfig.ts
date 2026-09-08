import { ColorType, CrosshairMode, type DeepPartial, type ChartOptions } from "lightweight-charts";
export const chartConfig: DeepPartial<ChartOptions> = {
  autoSize: true,
  layout: { background: { type: ColorType.Solid, color: "#10161e" }, textColor: "#94a3b8", fontFamily: "Arial, sans-serif", fontSize: 12, attributionLogo: true },
  grid: { vertLines: { color: "#1a2330" }, horzLines: { color: "#1a2330" } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: "#263141", scaleMargins: { top: 0.12, bottom: 0.27 } },
  timeScale: { borderColor: "#263141", timeVisible: true, secondsVisible: false, rightOffset: 5 },
  localization: { locale: "en-US" },
};
