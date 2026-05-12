"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  { href: "/tools/randomization", label: "Randomization" },
  { href: "/tools/timetable", label: "Time Table" },
  { href: "/tools/meal-log", label: "Meal Log" },
  { href: "/tools/sample-shipment", label: "Sample Shipment" },
  { href: "/tools/tube-labels", label: "Tube Labels" },
  { href: "/tools/adverse-event", label: "Adverse Event" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-label">Tools</div>
      {tools.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`sidebar-link${pathname === t.href ? " active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </aside>
  );
}
