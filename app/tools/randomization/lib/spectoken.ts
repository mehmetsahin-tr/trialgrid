// Verification spec token — a compact, self-contained, versioned string that
// carries every parameter needed to reproduce a schedule (a RunSnapshot) plus the
// engine versions and the original verification code. An auditor pastes it into
// the /verify page to independently regenerate the list and confirm the hash.
//
// Format:  TG1.<base64url(json payload)>.<checksum>
//   TG1       token/format version (bump if the payload shape changes)
//   payload   canonical JSON: { snap, rng, tool, code, generatedAt }
//   checksum  FNV-1a (8 hex) of the base64url body — catches truncation/typos
//             BEFORE anything is regenerated. Security comes from the SHA-256
//             hash match on /verify, not from this checksum.
//
// Dependency-free and isomorphic (browser + Node): base64url is implemented over
// bytes, UTF-8 via TextEncoder/TextDecoder.

import type { RunSnapshot } from "./snapshot.ts";

export const SPEC_TOKEN_VERSION = "TG1";

export interface SpecPayload {
  /** Full reproducible input set. */
  snap: RunSnapshot;
  /** RNG algo@version at generation time, e.g. "mulberry32@1.0". */
  rng: string;
  /** Tool version at generation time, e.g. "1.0.0". */
  tool: string;
  /** Verification code (first 16 hex of SHA-256) computed at generation time. */
  code: string;
  /** ISO generation timestamp (display only — not part of the hash). */
  generatedAt: string;
}

export type SpecTokenReason = "format" | "checksum" | "payload";

export class SpecTokenError extends Error {
  reason: SpecTokenReason;
  constructor(reason: SpecTokenReason, message: string) {
    super(message);
    this.name = "SpecTokenError";
    this.reason = reason;
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "";
    out += i + 2 < bytes.length ? B64[b2 & 63] : "";
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlToBytes(s: string): Uint8Array {
  const clean = s.replace(/-/g, "+").replace(/_/g, "/");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const val = B64.indexOf(ch);
    if (val === -1) throw new SpecTokenError("format", "Invalid character in token body.");
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/** FNV-1a 32-bit checksum as 8 lowercase hex chars (corruption detection only). */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Encode a payload into a `TG1.<body>.<checksum>` token. */
export function encodeSpec(payload: SpecPayload): string {
  const json = JSON.stringify(payload);
  const body = bytesToBase64url(new TextEncoder().encode(json));
  return `${SPEC_TOKEN_VERSION}.${body}.${fnv1a(body)}`;
}

/** Decode and integrity-check a token. Throws SpecTokenError on any problem. */
export function decodeSpec(token: string): SpecPayload {
  // Be forgiving about how the token was copied:
  //  1. Strip ALL whitespace — copying out of a PDF or a wrapped code box injects
  //     newlines/spaces at the line breaks.
  //  2. Extract the token by pattern, so a paste that also grabbed the surrounding
  //     label and the verify URL (which contains dots) still works. The base64url
  //     body never contains a dot, so the token is unambiguous within other text.
  const stripped = token.replace(/\s+/g, "");
  const match = stripped.match(/TG1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}/);
  const cleaned = match ? match[0] : stripped;
  const parts = cleaned.split(".");
  if (parts.length !== 3) {
    throw new SpecTokenError("format", "Token must have the form TG1.<body>.<checksum>.");
  }
  const [version, body, check] = parts;
  if (version !== SPEC_TOKEN_VERSION) {
    throw new SpecTokenError("format", `Unsupported token version "${version}".`);
  }
  if (fnv1a(body) !== check) {
    throw new SpecTokenError("checksum", "Checksum mismatch — the token looks incomplete or altered.");
  }
  let payload: SpecPayload;
  try {
    const json = new TextDecoder().decode(base64urlToBytes(body));
    payload = JSON.parse(json) as SpecPayload;
  } catch {
    throw new SpecTokenError("payload", "Token body could not be decoded.");
  }
  if (!payload || typeof payload !== "object" || !payload.snap || typeof payload.code !== "string") {
    throw new SpecTokenError("payload", "Token is missing required fields.");
  }
  return payload;
}
