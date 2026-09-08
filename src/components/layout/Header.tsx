"use client";
import { useEffect, useState } from "react";
export default function Header() {
  const [clock, setClock] = useState("—");
  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("en-GB", { timeZone: "UTC" }));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, []);
  return <header className="header"><a className="brand" href="#terminal"><span className="brand-mark">A</span>ATLAS <span className="brand-os">OS</span></a>
    <div className="header-divider" /><span className="header-label">ENERGY INTELLIGENCE</span>
    <div className="header-right"><span className="private-label">PERSONAL WORKSPACE</span><time className="mono">{clock} <span className="muted">UTC</span></time><span className="avatar">MK</span></div></header>;
}
