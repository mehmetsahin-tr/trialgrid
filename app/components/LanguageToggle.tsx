"use client";

import { useEffect, useState } from "react";

type Lang = "en" | "tr";

type Props = {
  /** Optional: omit when the toggle only sets the site-wide preference
      (localStorage), e.g. on the server-rendered landing page. */
  onChange?: (lang: Lang) => void;
  /** Render inline (within a layout) instead of absolutely positioned. */
  inline?: boolean;
};

export default function LanguageToggle({ onChange, inline = false }: Props) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("trialgrids-lang") as Lang | null;
      if (saved === "en" || saved === "tr") {
        setLang(saved);
        onChange?.(saved);
      }
    } catch {
      // localStorage not available, use default
    }
  }, [onChange]);

  const handleChange = (newLang: Lang) => {
    setLang(newLang);
    onChange?.(newLang);
    try {
      localStorage.setItem("trialgrids-lang", newLang);
    } catch {
      // localStorage not available, ignore
    }
  };

  return (
    <div
      style={{
        ...(inline
          ? { display: "inline-flex" }
          : { position: "absolute", top: "1.5rem", right: "1.5rem", display: "inline-flex", zIndex: 1 }),
        background: "var(--paper-2, #ffffff)",
        border: "1px solid var(--rule, #e8e4d8)",
        borderRadius: "4px",
        padding: "2px",
        fontFamily: "var(--font-inter, system-ui)",
        fontSize: "0.75rem",
      }}
    >
      <button
        onClick={() => handleChange("en")}
        style={{
          padding: "4px 14px",
          background: lang === "en" ? "var(--accent-2-ink, #b8432a)" : "transparent",
          color: lang === "en" ? "#ffffff" : "var(--muted, #7a7868)",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer",
          fontWeight: lang === "en" ? 600 : 500,
          letterSpacing: "0.5px",
          transition: "all 0.15s ease",
        }}
      >
        EN
      </button>
      <button
        onClick={() => handleChange("tr")}
        style={{
          padding: "4px 14px",
          background: lang === "tr" ? "var(--accent-2-ink, #b8432a)" : "transparent",
          color: lang === "tr" ? "#ffffff" : "var(--muted, #7a7868)",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer",
          fontWeight: lang === "tr" ? 600 : 500,
          letterSpacing: "0.5px",
          transition: "all 0.15s ease",
        }}
      >
        TR
      </button>
    </div>
  );
}
