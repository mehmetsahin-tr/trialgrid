"use client";

import { useEffect, useState } from "react";

/**
 * Clinical Trials Day banner (May 20).
 * Self-removes outside the visibility window — safe to leave in place year-round.
 * Window: May 20, 00:00 → May 21, 00:00 in the visitor's local time.
 */
export default function CelebrationBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const now = new Date();
    const isMay20 = now.getMonth() === 4 && now.getDate() === 20;
    if (!isMay20) return;

    try {
      const key = `ctd-dismissed-${now.getFullYear()}`;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1") {
        return;
      }
    } catch {
      // sessionStorage might be unavailable (private mode, etc.) — fail open and show banner.
    }

    setVisible(true);
  }, []);

  if (!visible || dismissed) return null;

  const dismiss = () => {
    try {
      const key = `ctd-dismissed-${new Date().getFullYear()}`;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* no-op */
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Clinical Trials Day"
      style={{
        position: "relative",
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--accent-2)",
        background:
          "linear-gradient(180deg, rgba(200,90,64,0.06) 0%, rgba(200,90,64,0.02) 100%)",
        padding: "1.1rem 1.4rem",
        marginBottom: "2rem",
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        style={{
          position: "absolute",
          top: ".55rem",
          right: ".65rem",
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: ".85rem",
          lineHeight: 1,
          cursor: "pointer",
          padding: ".25rem .4rem",
        }}
      >
        ×
      </button>

      <div
        className="mono"
        style={{
          color: "var(--accent-2)",
          marginBottom: ".5rem",
          letterSpacing: ".12em",
        }}
      >
        20 May · International Clinical Trials Day
      </div>

      <h2
        className="serif"
        style={{
          fontSize: "1.35rem",
          letterSpacing: "-.02em",
          marginBottom: ".55rem",
          maxWidth: "44ch",
          lineHeight: 1.2,
        }}
      >
        Bugün, klinik araştırmaya emek veren herkese
        {" "}
        <em style={{ color: "var(--accent)", fontStyle: "italic" }}>teşekkürler.</em>
      </h2>

      <p
        style={{
          color: "var(--muted)",
          fontSize: ".92rem",
          lineHeight: 1.6,
          maxWidth: "62ch",
        }}
      >
        20 Mayıs 1747'de James Lind ilk kontrollü klinik denemeyi başlattı —
        ve o günden bu yana sayısız araştırmacı, koordinatör, hemşire,
        eczacı, hekim ve gönüllü, daha güvenli ve etkili tedavilerin yolunu
        açtı. Trialgrids olarak, her gün bu işin görünmeyen yükünü taşıyan
        ekiplere saygı ve teşekkürlerimizi sunuyoruz.
      </p>
    </div>
  );
}
