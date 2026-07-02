"use client";

// Independent verification page. An auditor pastes a verification spec code and
// this page reproduces the schedule — through the SAME engine the generator uses
// (reproduceRun) — then recomputes the SHA-256 verification code and compares it.
// Fully client-side: nothing is uploaded, nothing is stored.

import { useState, useEffect } from "react";
import Link from "next/link";
import LanguageToggle from "@/app/components/LanguageToggle";
import { tr } from "../lib/strings";
import type { Lang } from "../lib/strings";
import { decodeSpec } from "../lib/spectoken";
import type { SpecPayload } from "../lib/spectoken";
import { reproduceRun } from "../lib/reproduce";
import type { Reproduced } from "../lib/reproduce";
import { RNG_ALGO, RNG_VERSION } from "../lib/rng";
import { TOOL_VERSION } from "../lib/meta";

type VerifyState =
  | { status: "idle" }
  | { status: "needToken" }
  | { status: "tokenError" }
  | { status: "reproError"; payload: SpecPayload }
  | {
      status: "done";
      payload: SpecPayload;
      result: Reproduced;
      codeMatch: boolean;
      docMatch: boolean | null;
      versionMismatch: boolean;
    };

const mono = "var(--font-jetbrains-mono)";

export default function VerifyPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [tokenInput, setTokenInput] = useState("");
  const [docCode, setDocCode] = useState("");
  const [state, setState] = useState<VerifyState>({ status: "idle" });
  const [busy, setBusy] = useState(false);

  // Bring the result into view after every verification, so a click always has a
  // visible effect even when the result renders below the fold. The timeout lets
  // the result paint before we scroll to it.
  useEffect(() => {
    if (state.status !== "idle") {
      const t = setTimeout(
        () => document.getElementById("verify-result")?.scrollIntoView({ block: "start" }),
        60
      );
      return () => clearTimeout(t);
    }
  }, [state]);

  async function verify() {
    // The short verification code alone cannot reproduce a schedule — the full TG1
    // spec code is required. Guide the user instead of doing nothing.
    if (!tokenInput.trim()) {
      setState({ status: "needToken" });
      return;
    }
    setBusy(true);
    try {
      let payload: SpecPayload;
      try {
        payload = decodeSpec(tokenInput);
      } catch {
        setState({ status: "tokenError" });
        return;
      }
      const rep = await reproduceRun(payload.snap);
      if (!rep.ok) {
        setState({ status: "reproError", payload });
        return;
      }
      const codeMatch = rep.result.code === payload.code;
      const entered = docCode.trim().toUpperCase();
      const docMatch = entered ? entered === rep.result.code : null;
      const versionMismatch =
        payload.rng !== `${RNG_ALGO}@${RNG_VERSION}` || payload.tool !== TOOL_VERSION;
      setState({ status: "done", payload, result: rep.result, codeMatch, docMatch, versionMismatch });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setTokenInput("");
    setDocCode("");
    setState({ status: "idle" });
  }

  const ok = state.status === "done" && state.codeMatch;

  return (
    <main style={{ position: "relative" }}>
      <div className="hero">
        <div>
          <p className="eyebrow">{tr(lang, "eyebrow")}</p>
          <h1>{tr(lang, "verifyHeading")}</h1>
          <p className="lede">{tr(lang, "verifyIntro")}</p>
        </div>
        <div className="meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".75rem" }}>
          <LanguageToggle onChange={setLang} inline />
          <div>
            verify
            <br />
            client-side only
            <br />
            {tr(lang, "verifyReadonly")}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{tr(lang, "verifyHeading")}</h2>
          <Link href="/tools/randomization" className="tag" style={{ textDecoration: "none" }}>
            {tr(lang, "verifyOpenTool")}
          </Link>
        </div>
        <div className="panel-body">
          <label>{tr(lang, "verifyInputLabel")}</label>
          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={tr(lang, "verifyInputPh")}
            spellCheck={false}
            rows={4}
            style={{
              width: "100%",
              fontFamily: mono,
              fontSize: ".72rem",
              lineHeight: 1.5,
              wordBreak: "break-all",
              padding: ".6rem .7rem",
              marginTop: ".3rem",
              resize: "vertical",
            }}
          />
          <p style={{ margin: ".35rem 0 0", fontSize: ".68rem", lineHeight: 1.5, color: "var(--muted, #7a7868)" }}>
            {tr(lang, "verifyTokenHint")}
          </p>

          <div style={{ marginTop: "1rem", maxWidth: "26rem" }}>
            <label>{tr(lang, "verifyCodeLabel")}</label>
            <input
              type="text"
              value={docCode}
              onChange={(e) => setDocCode(e.target.value)}
              placeholder={tr(lang, "verifyCodePh")}
              spellCheck={false}
              style={{ width: "100%", fontFamily: mono, marginTop: ".3rem", textTransform: "uppercase" }}
            />
            <p style={{ margin: ".35rem 0 0", fontSize: ".68rem", lineHeight: 1.5, color: "var(--muted, #7a7868)" }}>
              {tr(lang, "verifyCodeHint")}
            </p>
          </div>

          <div className="btn-row" style={{ marginTop: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={verify} disabled={busy}>
              {busy ? "…" : tr(lang, "verifyBtn")}
            </button>
            {state.status !== "idle" && (
              <button className="btn ghost" onClick={reset}>
                ×
              </button>
            )}
          </div>

          <div id="verify-result" style={{ scrollMarginTop: "6rem" }}>
          {state.status === "needToken" && (
            <div style={banner("#b45309")}>⚠ {tr(lang, "verifyNeedToken")}</div>
          )}
          {state.status === "tokenError" && (
            <div style={banner("#c85a40")}>⚠ {tr(lang, "verifyErrToken")}</div>
          )}
          {state.status === "reproError" && (
            <div style={banner("#c85a40")}>⚠ {tr(lang, "verifyErrRepro")}</div>
          )}

          {state.status === "done" && (
            <>
              <div style={banner(ok ? "#5a7a3a" : "#c85a40")}>
                {ok ? "✓ " : "✗ "}
                {ok ? tr(lang, "verifyOk") : tr(lang, "verifyFail")}
              </div>

              {state.versionMismatch && (
                <p style={{ marginTop: ".6rem", fontSize: ".72rem", lineHeight: 1.55, color: "#b45309", fontFamily: mono }}>
                  ⚠ {tr(lang, "verifyVersionNotice")}
                </p>
              )}

              {/* Code comparison */}
              <div style={{ marginTop: "1rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: "1rem 1.25rem", background: "var(--paper-2, #fff)" }}>
                {codeLine(tr(lang, "verifyRecomputed"), state.result.code, null)}
                {codeLine(tr(lang, "verifyExpected"), state.payload.code, state.codeMatch, tr(lang, "verifyMatch"), tr(lang, "verifyNoMatch"))}
                {state.docMatch !== null &&
                  codeLine(tr(lang, "verifyDocCode"), docCode.trim().toUpperCase(), state.docMatch, tr(lang, "verifyMatch"), tr(lang, "verifyNoMatch"))}
              </div>

              {/* Reproduced audit header */}
              <div style={{ marginTop: "1rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: "1rem 1.25rem", fontSize: ".75rem" }}>
                <strong style={{ fontFamily: mono, textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem" }}>
                  {tr(lang, "auditTitle")}
                </strong>
                <div style={{ marginTop: ".5rem" }}>
                  {auditRows(state.payload, state.result, lang).map(([k, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".1rem 0" }}>
                      <span style={{ color: "var(--muted, #7a7868)" }}>{k}</span>
                      <span style={{ fontFamily: mono, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reproduced schedule */}
              <div style={{ marginTop: "1rem" }}>
                <div style={{ fontFamily: mono, textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".64rem", color: "var(--muted, #7a7868)", marginBottom: ".4rem" }}>
                  {tr(lang, "verifyReproHeading")}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <ScheduleTable result={state.result} lang={lang} />
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}

function banner(color: string): React.CSSProperties {
  return {
    marginTop: "1rem",
    padding: ".75rem 1rem",
    border: `1px solid ${color}`,
    color,
    background: `${color}0d`,
    borderRadius: "6px",
    fontSize: ".8rem",
    fontWeight: 700,
    fontFamily: mono,
    lineHeight: 1.5,
  };
}

function codeLine(label: string, value: string, match: boolean | null, matchTxt?: string, noMatchTxt?: string) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: ".2rem 0" }}>
      <span style={{ color: "var(--muted, #7a7868)", fontSize: ".72rem" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <code style={{ fontFamily: mono, fontSize: ".9rem", letterSpacing: ".05em" }}>{value || "—"}</code>
        {match !== null && (
          <span style={{ fontFamily: mono, fontSize: ".68rem", color: match ? "#5a7a3a" : "#c85a40" }}>
            {match ? `✓ ${matchTxt}` : `✗ ${noMatchTxt}`}
          </span>
        )}
      </span>
    </div>
  );
}

function auditRows(payload: SpecPayload, result: Reproduced, lang: Lang): [string, string][] {
  const m = result.meta;
  const rows: [string, string][] = [];
  if (m.studyCode) rows.push([tr(lang, "studyCode").replace(/ \(.*\)$/, ""), m.studyCode]);
  if (payload.snap.sponsor.trim()) rows.push([tr(lang, "mSponsor"), payload.snap.sponsor.trim()]);
  if ((m.generatedBy ?? "").trim()) rows.push([tr(lang, "mGeneratedBy"), (m.generatedBy ?? "").trim()]);
  rows.push([tr(lang, "mDesign"), m.method === "parallel" ? tr(lang, "parallel") : (m.designId ?? "-")]);
  rows.push([tr(lang, "mTreatments"), `${m.drugs.join(", ")} (${m.drugs.length})`]);
  rows.push([tr(lang, "mSequences"), `${result.sequenceLabels.join(", ")} (${result.sequenceLabels.length})`]);
  if (result.strata.length) {
    const desc = result.axes.length
      ? `${result.axes.map((a) => `${a.name} (${a.levels.join(", ")})`).join(" × ")} · ${result.rows.length / result.strata.length}/${lang === "en" ? "cell" : "hücre"}`
      : result.strata.join(", ");
    rows.push([tr(lang, "mStratification"), desc]);
  }
  rows.push([tr(lang, "mBlock"), String(m.blockSize)]);
  rows.push([tr(lang, "mSeed"), String(m.seed)]);
  rows.push([tr(lang, "mAlgo"), payload.rng.replace("@", " v")]);
  rows.push([tr(lang, "mGenerated"), payload.generatedAt]);
  rows.push([tr(lang, "verifyEnginePaper"), `${payload.rng.replace("@", " v")} · tool v${payload.tool}`]);
  rows.push([`${tr(lang, "mVerification")} (SHA-256)`, result.code]);
  return rows;
}

function ScheduleTable({ result, lang }: { result: Reproduced; lang: Lang }) {
  const stratified = result.strata.length > 0;
  const periods = result.periods;
  const all = [...result.rows, ...result.reserveRows];
  const setLabel = lang === "en" ? "Set" : "Küme";
  const mainWord = lang === "en" ? "Main" : "Esas";
  return (
    <table style={{ width: "100%", fontSize: ".74rem", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={th}>{tr(lang, "idCol")}</th>
          {stratified && <th style={th}>{tr(lang, "stratumCol")}</th>}
          <th style={th}>{setLabel}</th>
          <th style={th}>{tr(lang, "seqCol")}</th>
          {Array.from({ length: periods }, (_, i) => (
            <th key={i} style={{ ...th, textAlign: "center" }}>{`${tr(lang, "period")} ${i + 1}`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {all.map((row, i) => (
          <tr key={i}>
            <td style={td}>{row.subjectId}</td>
            {stratified && <td style={td}>{row.stratum ?? ""}</td>}
            <td style={td}>{row.isReserve ? tr(lang, "reserveTag") : mainWord}</td>
            <td style={{ ...td, fontWeight: 700 }}>{row.sequenceLabel}</td>
            {Array.from({ length: periods }, (_, p) => (
              <td key={p} style={{ ...td, textAlign: "center" }}>{row.treatments[p] ?? ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: ".4rem .6rem",
  borderBottom: "1px solid var(--rule, #e8e4d8)",
  fontFamily: mono,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  fontSize: ".64rem",
  color: "var(--muted, #7a7868)",
};

const td: React.CSSProperties = {
  padding: ".35rem .6rem",
  borderBottom: "1px solid var(--rule, #f0ede4)",
  fontFamily: mono,
};
