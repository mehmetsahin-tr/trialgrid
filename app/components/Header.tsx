"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

const mobileTools = [
  { href: "/tools/randomization", label: "Randomization" },
  { href: "/tools/timetable", label: "Time Table" },
  { href: "/tools/meal-log", label: "Meal Log" },
  { href: "/tools/sample-shipment", label: "Sample Shipment" },
  { href: "/tools/tube-labels", label: "Tube Labels" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function closeAll() {
    setOpen(false);
    setToolsOpen(false);
  }

  return (
    <header>
      <div className="header-inner">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          trial<span>·</span>grids
        </Link>
        <button
          className="nav-toggle"
          onClick={() => { setOpen(!open); setToolsOpen(false); }}
          aria-label="Menu"
        >
          ≡ Menu
        </button>
        <nav className={open ? "open" : ""}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
              onClick={closeAll}
            >
              {item.label}
            </Link>
          ))}
          <button
            className={`nav-mobile-divider nav-tools-toggle${toolsOpen ? " tools-open" : ""}`}
            onClick={() => setToolsOpen(!toolsOpen)}
          >
            Tools <span className="tools-chevron">{toolsOpen ? "▲" : "▼"}</span>
          </button>
          {toolsOpen && mobileTools.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-mobile-tool${isActive(item.href) ? " active" : ""}`}
              onClick={closeAll}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
