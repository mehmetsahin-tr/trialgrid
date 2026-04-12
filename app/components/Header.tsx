"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/randomization", label: "Randomization" },
  { href: "/time-table", label: "Time Table" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header>
      <Link href="/" className="logo">
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
            className={pathname === item.href ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
