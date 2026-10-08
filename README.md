# Trialgrids

**Clinical research tables, digitized.** Free, browser-based tools for BE/BA and crossover clinical trials.

**▶ Live:** [trialgrids.com](https://trialgrids.com)

No accounts. No uploads. Study data never leaves the user's device.

---

## Why

Everyday study documentation is still built by hand: randomization lists in Excel, tube labels in Word, sample counts on paper, the same time table rewritten for every new protocol. Each task takes minutes; across studies, subjects, periods and timepoints those minutes become hours.

Trialgrids turns these recurring tasks into small, focused tools that produce clean, audit-ready output in seconds.

## Tools

| Tool | What it does | Output |
|---|---|---|
| [Randomization Lists](https://trialgrids.com/tools/randomization) | Seeded, reproducible block randomization for BE/BA and crossover designs, with a [verification page](https://trialgrids.com/tools/randomization/verify) to reproduce a list from its specification token | PDF, XLSX |
| [Schedule of Assessments](https://trialgrids.com/tools/timetable) | SPIRIT-style schedule of assessments and study-day time tables | PDF |
| [Meal Intake Log](https://trialgrids.com/tools/meal-log) | Meal start/end times, completion and dropouts across study periods | PDF |
| [Sample Shipment Counts](https://trialgrids.com/tools/sample-shipment) | Exact bioanalytical tube counts with master/backup aliquots, dropouts, no-shows and lost samples | PDF |
| [Tube Label Generator](https://trialgrids.com/tools/tube-labels) | Printable blood and plasma tube labels (Tanex TW-2052 compatible), tight-packed sheets with timepoint separators | DOCX |
| [Adverse Event Form](https://trialgrids.com/tools/adverse-event) | Printable AE forms, ICH E2A aligned, fillable at the bedside on phone or tablet | PDF |

Every tool is intentionally narrow: it does one job well and gets out of the way.

## Principles

- **Privacy-first.** All generation happens client-side in the browser. There is no backend that receives or stores study data; closing the tab clears it. The site uses anonymous page-view analytics (Vercel Analytics) and nothing else.
- **Documentation aid, not a clinical system.** Trialgrids is not a CDMS, an EDC or a substitute for an institution's validated systems. It does not handle patient-identifying information or integrate with EDC/CDMS platforms.
- **Free to use** for researchers, study coordinators, biostatisticians, investigator sites and small CROs.

## Tech stack

[Next.js 14](https://nextjs.org) (App Router) · React 18 · TypeScript · Tailwind CSS · [jsPDF](https://github.com/parallax/jsPDF) + jspdf-autotable · [docx](https://github.com/dolanmiu/docx) · deployed on Vercel

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm test        # randomization engine tests
npm run lint
```

### Project structure

```
app/
├── tools/
│   ├── randomization/   # generator, seeded RNG, spec tokens, exports, /verify
│   ├── timetable/
│   ├── meal-log/
│   ├── sample-shipment/
│   ├── tube-labels/     # label layout + Word export
│   └── adverse-event/
├── components/          # shared UI (header, sidebar, language toggle, …)
├── about/ · contact/ · privacy/ · terms/
├── layout.tsx           # site metadata, fonts, analytics
├── sitemap.ts · robots.ts
public/                  # icons, Open Graph image, web manifest
```

## Related

- [TMF Control List](https://github.com/mehmetsahin-tr/trial-master-file-control-list): free, offline Trial Master File checklist for BE/BA studies

## License

© 2026 Mehmet Şahin. All rights reserved. The source is published for transparency; please get in touch before reusing it.

## Contact

[trialgrids.com](https://trialgrids.com) · [mehmetsahindev@gmail.com](mailto:mehmetsahindev@gmail.com) · [@mehmetsahin_tr](https://x.com/mehmetsahin_tr)
