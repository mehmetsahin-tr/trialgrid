"use client";

import { useState } from "react";

const SHARE_TITLE = "Trialgrids — Clinical Research Tables, Digitized";
const SHARE_TEXT =
  "Generate randomization schedules and assessment tables in your browser. Your data never leaves your device.";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          await copyFallback(url);
        }
      }
    } else {
      await copyFallback(url);
    }
  }

  async function copyFallback(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share this page"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: ".4rem",
        background: "none",
        border: "2px solid var(--rule)",
        color: "var(--muted)",
        fontFamily: "var(--font-jetbrains-mono)",
        fontSize: ".72rem",
        textTransform: "uppercase",
        letterSpacing: ".08em",
        padding: ".45rem .85rem",
        cursor: "pointer",
        transition: "border-color .15s, color .15s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderImage = "linear-gradient(to right, #7c3aed 50%, #d97757 50%) 1";
        el.style.color = "var(--ink)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderImage = "";
        el.style.borderColor = "var(--rule)";
        el.style.color = "var(--muted)";
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
