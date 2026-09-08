export default function WeatherPanel() {
  return <section className="panel weather-panel" id="weather"><div className="panel-title"><h2>Weather intelligence</h2><span className="badge">NIEPODŁĄCZONE</span></div>
    <p className="eyebrow">USA · POPYT NA GAZ</p><div className="weather-metrics"><div><span>HDD</span><strong>—</strong><small>ogrzewanie</small></div><div><span>CDD</span><strong>—</strong><small>chłodzenie</small></div></div>
    <div className="empty-row"><span>Prognoza 6–10 dni</span><span>Brak danych</span></div><div className="empty-row"><span>Prognoza 8–14 dni</span><span>Brak danych</span></div>
    <p className="panel-note">NOAA i odchylenia od normy dodamy w kolejnym etapie. Wpływ pogody na popyt nie jest jeszcze obliczany.</p></section>;
}
