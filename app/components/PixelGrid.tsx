"use client";

import { useEffect, useRef } from "react";

/**
 * PixelGrid — a pixel-art animation of a clinical crossover randomization
 * sequence being generated. A scan front sweeps left→right assigning treatment
 * codes (A = accent purple, B = terracotta, washout = neutral) to a grid of
 * subjects × periods, then holds and re-randomizes. Rendered on a low-res canvas
 * scaled up with `image-rendering: pixelated` to stay crisp and on-theme with the
 * site's paper texture.
 */

const COLS = 16;
const ROWS = 8;
const CELL = 10;
const GAP = 3;
const W = COLS * CELL + (COLS + 1) * GAP; // 211
const H = ROWS * CELL + (ROWS + 1) * GAP; // 107

// Brand palette
const PAPER = "#f9f9f8";
const EMPTY = "rgba(26,26,26,0.05)";
const A = "#7c3aed"; // treatment A — accent purple
const B = "#d97757"; // treatment B — terracotta
const WASH = "rgba(26,26,26,0.16)"; // washout / neutral

// tiny seeded PRNG (mulberry32)
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a balanced-ish crossover assignment for the grid: each column is a
// "subject" with a sequence offset; cells alternate A/B by period with the
// occasional washout cell for texture. Returns codes: 0 empty, 1 A, 2 B, 3 wash.
function buildPattern(seed: number): Uint8Array {
  const rand = rng(seed);
  const grid = new Uint8Array(COLS * ROWS);
  for (let c = 0; c < COLS; c++) {
    const offset = rand() < 0.5 ? 0 : 1;
    for (let r = 0; r < ROWS; r++) {
      const i = c * ROWS + r;
      if (rand() < 0.12) {
        grid[i] = 3; // washout
      } else {
        grid[i] = (r + offset) % 2 === 0 ? 1 : 2;
      }
    }
  }
  return grid;
}

function colorFor(code: number): string {
  switch (code) {
    case 1:
      return A;
    case 2:
      return B;
    case 3:
      return WASH;
    default:
      return EMPTY;
  }
}

export default function PixelGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let seed = (Date.now() % 100000) | 0;
    let pattern = buildPattern(seed);

    function drawCell(c: number, r: number, color: string, scale = 1) {
      const x = GAP + c * (CELL + GAP);
      const y = GAP + r * (CELL + GAP);
      const inset = (CELL * (1 - scale)) / 2;
      ctx!.fillStyle = color;
      ctx!.fillRect(x + inset, y + inset, CELL * scale, CELL * scale);
    }

    function paintBackground() {
      ctx!.fillStyle = PAPER;
      ctx!.fillRect(0, 0, W, H);
    }

    // Static render for reduced-motion users.
    if (reduced) {
      paintBackground();
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          drawCell(c, r, colorFor(pattern[c * ROWS + r]));
        }
      }
      return;
    }

    let raf = 0;
    let start = performance.now();
    const SWEEP = 3200; // ms to sweep across all columns
    const HOLD = 1400; // ms to hold the full grid before reshuffling
    const cycle = SWEEP + HOLD;

    function frame(now: number) {
      const elapsed = now - start;
      const t = elapsed % cycle;
      const cycleIndex = Math.floor(elapsed / cycle);

      // reshuffle pattern at the start of each new cycle
      const expectedSeed = ((Date.now() & 0xffff) ^ (cycleIndex * 2654435761)) | 0;
      if (t < 16 && seed !== expectedSeed) {
        seed = expectedSeed;
        pattern = buildPattern(seed);
      }

      paintBackground();

      // sweep front position in fractional columns
      const front = (t / SWEEP) * COLS;

      for (let c = 0; c < COLS; c++) {
        // reveal progress for this column: 0 (hidden) → 1 (fully assigned)
        const reveal = Math.max(0, Math.min(1, front - c));
        for (let r = 0; r < ROWS; r++) {
          const code = pattern[c * ROWS + r];
          if (reveal <= 0) {
            drawCell(c, r, EMPTY);
          } else {
            // brief pop-in scale as the front passes
            const scale = 0.55 + 0.45 * reveal;
            drawCell(c, r, colorFor(code), Math.min(1, scale));
          }
        }
      }

      // scan cursor column highlight
      if (front >= 0 && front < COLS) {
        const c = Math.floor(front);
        const x = GAP + c * (CELL + GAP) - 1;
        ctx!.fillStyle = "rgba(124,58,237,0.18)";
        ctx!.fillRect(x, 1, CELL + 2, H - 2);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pixel-grid" aria-hidden="true">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="pixel-grid-canvas"
      />
    </div>
  );
}
