export default function Menu() {
  return <nav className="menu" aria-label="Sekcje terminala"><span className="menu-label">WORKSPACE</span>
    <a href="#terminal" className="menu-active">Terminal <span>01</span></a>
    <a href="#weather">Pogoda <span>02</span></a><a href="#market-score">Market Score <span>03</span></a>
    <a href="#analyst">AI Analyst <span>04</span></a>
    <div className="menu-bottom"><span className="muted">RYNEK</span><strong>Natural Gas</strong><small>Henry Hub · zakres projektu</small><span className="version">ATLAS / v0.1</span></div></nav>;
}
