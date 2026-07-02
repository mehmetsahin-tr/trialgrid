"use client";

import { useEffect, useRef } from "react";

/**
 * HeaderPixels — a tiny pixel-art "sprite strip" for the header: a bubbling
 * test tube, a computer typing, a pulsing stethoscope and a rolling capsule.
 * Same recipe as PixelGrid: low-res canvas scaled up with image-rendering:
 * pixelated, brand palette, ~6fps game-style ticks, static frame for
 * prefers-reduced-motion. Purely decorative (aria-hidden).
 */

const PAL: Record<string, string> = {
  K: "#1a1a1a", // ink outline
  G: "rgba(26,26,26,0.38)", // glass / soft outline
  P: "#7c3aed", // accent purple
  O: "#d97757", // Claude terracotta
  o: "#b8432a", // dark terracotta (beat)
  L: "#f0bfae", // light terracotta (bubble / highlight)
};

const TUBE = [
  "GG...GG",
  ".G...G.",
  ".G...G.",
  ".G...G.",
  ".G...G.",
  ".GOOOG.",
  ".GOOOG.",
  ".GOOOG.",
  ".GOOOG.",
  "..GGG..",
];

const COMPUTER = [
  "KKKKKKKKKKK",
  "K.........K",
  "K.........K",
  "K.........K",
  "K.........K",
  "K.........K",
  "KKKKKKKKKKK",
  "....KKK....",
  "...KKKKK...",
];

// Screen pixels "typed" one by one (row, col, palette key).
const SCREEN_PIXELS: [number, number, string][] = [
  [2, 2, "P"], [2, 3, "P"], [2, 5, "O"], [2, 6, "O"], [2, 7, "O"],
  [3, 2, "O"], [3, 3, "P"], [3, 4, "P"], [3, 5, "P"],
  [4, 2, "P"], [4, 3, "O"],
];

const STETH = [
  ".K...K....",
  ".K...K....",
  ".K...K....",
  "..K.K.....",
  "...K......",
  "...K......",
  "...KKKK...",
  "......K...",
  ".....OOO..",
  ".....OOO..",
];

const PILL = [
  ".PPOO.",
  "PPPOOO",
  "PPPOOO",
  ".PPOO.",
];
const PILL_FLIPPED = PILL.map((row) => row.split("").reverse().join(""));

// Layout on the logical canvas: sprite x-origins with 6px gutters.
const X_TUBE = 1;
const X_COMP = 14;
const X_STETH = 31;
const X_PILL = 47;
const W = 54;
const H = 12;
const TICK_MS = 160; // ~6fps, chunky game feel

export default function HeaderPixels() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function blit(map: string[], x: number, y: number) {
      for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
          const ch = map[r][c];
          if (ch === ".") continue;
          ctx!.fillStyle = PAL[ch];
          ctx!.fillRect(x + c, y + r, 1, 1);
        }
      }
    }

    function draw(tick: number) {
      ctx!.clearRect(0, 0, W, H);

      // Test tube — idle bob + a bubble rising through the liquid.
      const tubeY = 1 + (tick % 8 < 4 ? 0 : 1);
      blit(TUBE, X_TUBE, tubeY);
      const bubbleRow = 8 - (tick % 4); // rows 8..5 (inside the liquid)
      ctx!.fillStyle = PAL.L;
      ctx!.fillRect(X_TUBE + 3, tubeY + bubbleRow, 1, 1);

      // Computer — screen content typed pixel by pixel, blinking cursor.
      blit(COMPUTER, X_COMP, 1);
      const cycle = SCREEN_PIXELS.length + 8; // hold a beat before clearing
      const typed = Math.min(tick % cycle, SCREEN_PIXELS.length);
      for (let i = 0; i < typed; i++) {
        const [r, c, k] = SCREEN_PIXELS[i];
        ctx!.fillStyle = PAL[k];
        ctx!.fillRect(X_COMP + c, 1 + r, 1, 1);
      }
      if (tick % 2 === 0) {
        const cur = typed < SCREEN_PIXELS.length ? SCREEN_PIXELS[typed] : [5, 2, "K"];
        ctx!.fillStyle = PAL.K;
        ctx!.fillRect(X_COMP + (cur[1] as number), 1 + (cur[0] as number), 1, 1);
      }

      // Stethoscope — chest piece beats (dark flash + faint ring).
      blit(STETH, X_STETH, 1);
      const beat = tick % 5 === 0;
      if (beat) {
        ctx!.fillStyle = PAL.o;
        ctx!.fillRect(X_STETH + 5, 1 + 8, 3, 2); // chest piece flash
        ctx!.fillStyle = "rgba(217,119,87,0.35)"; // expanding ring
        ctx!.fillRect(X_STETH + 5, 1 + 7, 3, 1);
        ctx!.fillRect(X_STETH + 4, 1 + 8, 1, 2);
        ctx!.fillRect(X_STETH + 8, 1 + 8, 1, 2);
      }

      // Capsule — rolls (mirror flip) with its own bob phase.
      const pillY = 4 + ((tick + 2) % 8 < 4 ? 0 : 1);
      blit(Math.floor(tick / 6) % 2 === 0 ? PILL : PILL_FLIPPED, X_PILL, pillY);
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      draw(SCREEN_PIXELS.length + 1); // fully-typed, calm static frame
      return;
    }

    let raf = 0;
    let lastTick = -1;
    function frame(now: number) {
      const tick = Math.floor(now / TICK_MS);
      if (tick !== lastTick) {
        lastTick = tick;
        draw(tick);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="header-pixels" aria-hidden="true">
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}
