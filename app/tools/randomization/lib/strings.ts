// Bilingual UI strings for the randomization tool.
export type Lang = "en" | "tr";

type Dict = Record<string, { en: string; tr: string }>;

const D: Dict = {
  eyebrow: {
    en: "Randomization for bioequivalence & crossover trials",
    tr: "Biyoeşdeğerlik & çapraz çalışmalar için randomizasyon",
  },
  heading: { en: "Randomization.", tr: "Randomizasyon." },
  lede: {
    en: "Generate verifiable, reproducible randomization schedules for bioequivalence, bioavailability, and crossover trials — including replicate designs for highly variable drugs. Every schedule carries a seed, algorithm version, and SHA-256 verification code so an independent auditor can reproduce it. Runs entirely in your browser; your data never leaves this device.",
    tr: "Biyoeşdeğerlik, biyoyararlanım ve çapraz çalışmalar için — yüksek değişkenlikli ilaçlara yönelik replicate tasarımlar dâhil — doğrulanabilir, yeniden üretilebilir randomizasyon listeleri üretin. Her liste; seed, algoritma sürümü ve SHA-256 doğrulama kodu taşır; böylece bağımsız bir denetçi listeyi yeniden üretebilir. Tamamen tarayıcınızda çalışır; veriniz bu cihazdan çıkmaz.",
  },
  studyParams: { en: "Study parameters", tr: "Çalışma parametreleri" },
  configure: { en: "configure", tr: "yapılandır" },
  method: { en: "Method", tr: "Yöntem" },
  parallel: { en: "Parallel", tr: "Paralel" },
  crossover: { en: "Crossover", tr: "Çapraz" },
  design: { en: "Crossover design", tr: "Çapraz tasarım" },
  selectDesign: { en: "Select a design", tr: "Bir tasarım seçin" },
  totalVolunteers: { en: "Total volunteers", tr: "Toplam gönüllü" },
  drugs: { en: "Drugs", tr: "İlaçlar" },
  drugsHintReplicate: {
    en: "First = Test (T), second = Reference (R).",
    tr: "İlki = Test (T), ikincisi = Referans (R).",
  },
  periodsDerived: { en: "Periods", tr: "Dönem" },
  seqCount: { en: "Sequences", tr: "Sekans" },
  seed: { en: "Seed", tr: "Seed" },
  randomize: { en: "randomize", tr: "rastgele" },
  blockSize: { en: "Block size", tr: "Blok boyutu" },
  pleaseSelect: { en: "Please select", tr: "Lütfen seçin" },
  allocationRatio: { en: "Allocation ratio", tr: "Tahsis oranı" },
  studyCode: { en: "Study / protocol code (optional)", tr: "Çalışma / protokol kodu (opsiyonel)" },
  generate: { en: "Generate", tr: "Üret" },
  exportPdf: { en: "Export PDF", tr: "PDF indir" },
  selectMethodFirst: { en: "Generate a schedule first.", tr: "Önce bir liste üretin." },
  suggestionPrefix: { en: "Try", tr: "Deneyin:" },
  // result + audit
  idCol: { en: "ID", tr: "ID" },
  seqCol: { en: "Sequence", tr: "Sekans" },
  period: { en: "Period", tr: "Dönem" },
  treatment: { en: "Treatment", tr: "Tedavi" },
  auditTitle: { en: "Audit & reproducibility", tr: "Denetim & yeniden üretim" },
  verified: { en: "verifiable", tr: "doğrulanabilir" },
  mDesign: { en: "Design", tr: "Tasarım" },
  mTreatments: { en: "Treatments", tr: "Tedavi sayısı" },
  mSequences: { en: "Sequences", tr: "Sekans sayısı" },
  mPerSeq: { en: "Subjects / sequence", tr: "Denek / sekans" },
  mSeed: { en: "Seed", tr: "Seed" },
  mAlgo: { en: "Algorithm", tr: "Algoritma" },
  mBlock: { en: "Block size", tr: "Blok boyutu" },
  mGenerated: { en: "Generated", tr: "Üretim zamanı" },
  mTool: { en: "Tool", tr: "Araç" },
  mVerification: { en: "Verification code", tr: "Doğrulama kodu" },
  varianceBalanced: { en: "variance-balanced", tr: "varyans-dengeli" },
  reproCheck: { en: "Reproducibility check", tr: "Yeniden üretim kontrolü" },
  reproOk: { en: "Reproduced — identical (hash match)", tr: "Yeniden üretildi — birebir aynı (hash eşleşti)" },
  reproMismatch: { en: "Mismatch — hash differs", tr: "Uyuşmuyor — hash farklı" },
  reproHint: {
    en: "Re-runs the same seed + parameters and compares the SHA-256 hash.",
    tr: "Aynı seed + parametrelerle yeniden üretip SHA-256 hash'i karşılaştırır.",
  },
};

export function tr(lang: Lang, key: keyof typeof D): string {
  return D[key][lang];
}
