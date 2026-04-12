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
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header>
      <div className="header-inner">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          trial<span>·</span>grid
        </Link>
        <button
          className="nav-toggle"
          onClick={() => setOpen(!open)}
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
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {/* Tool links visible only in mobile nav */}
          <span className="nav-mobile-divider">Tools</span>
          {mobileTools.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-mobile-tool${isActive(item.href) ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
