"use client";

import { useState } from "react";
import LanguageToggle from "@/app/components/LanguageToggle";

type Lang = "en" | "tr";

export default function ContactPage() {
  const [lang, setLang] = useState<Lang>("en");

  return (
    <main style={{ position: "relative" }}>
      <LanguageToggle onChange={setLang} />

      {lang === "en" ? <ContactEN /> : <ContactTR />}
    </main>
  );
}

function ContactEN() {
  return (
    <>
      <div className="hero">
        <h1>Contact.</h1>
        <div className="meta">
          questions
          <br />
          feedback
          <br />
          bugs
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          For anything related to Trialgrids — questions about the tools,
          feature suggestions, bug reports, partnership inquiries, or just to
          say hello — reach out directly.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          I read every email and respond within 1 business day.
        </p>

        <div
          style={{
            border: "1px solid var(--rule)",
            padding: "1.2rem",
            background: "var(--paper-2)",
            display: "inline-block",
            marginBottom: "2.5rem",
          }}
        >
          <div className="mono" style={{ marginBottom: ".5rem", color: "var(--accent)" }}>
            Direct contact
          </div>
          <a
            href="mailto:info@trialgrids.com"
            style={{ fontSize: ".85rem", color: "var(--accent-2)", fontFamily: "var(--font-jetbrains-mono)", textDecoration: "none" }}
          >
            info@trialgrids.com
          </a>
        </div>

        <h2>About Trialgrids</h2>
        <p>
          Trialgrids is built and maintained by Mehmet Şahin, a clinical research
          professional with experience in bioequivalence and bioavailability
          (BE/BA) studies. The tools were created to address the daily friction
          points encountered in BE/BA work — the manual Word workflows, the
          Excel hacks, the repetitive copy-paste-replace cycles that quietly
          steal hours from research staff every week.
        </p>
        <p>Based in Gaziantep, Turkey. Serving researchers worldwide.</p>

        <h2>What to expect</h2>
        <p>When you write:</p>
        <ul>
          <li><strong>Questions about the tools</strong> — I&apos;ll answer based on my own clinical research background and explain how to get the most out of each tool</li>
          <li><strong>Feature suggestions</strong> — every suggestion is read carefully. Not all become features, but all inform the roadmap</li>
          <li><strong>Bug reports</strong> — please include browser version, what you were doing, and what happened. I&apos;ll prioritize and follow up</li>
          <li><strong>Partnership or commercial inquiries</strong> — happy to discuss</li>
        </ul>

        <h2>What this is not</h2>
        <p>
          Trialgrids is not a 24/7 support service. It&apos;s not a replacement
          for your institution&apos;s validated systems. It&apos;s a free
          toolkit, maintained as a side project alongside clinical research work.
        </p>
        <p>
          If you&apos;re working on a regulatory submission and you spot
          something concerning in a tool&apos;s output,{" "}
          <strong>please verify against your protocol or sponsor&apos;s data
          management plan first</strong>, then let me know what you found.
        </p>
      </div>
    </>
  );
}

function ContactTR() {
  return (
    <>
      <div className="hero">
        <h1>İletişim.</h1>
        <div className="meta">
          sorular
          <br />
          geri bildirim
          <br />
          hatalar
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          Trialgrids ile ilgili her şey için — araçlar hakkında sorular, özellik
          önerileri, hata raporları, ortaklık sorgulamaları veya sadece merhaba
          demek için — doğrudan iletişime geçin.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          Her e-postayı okuyorum ve 1 iş günü içinde yanıtlıyorum.
        </p>

        <div
          style={{
            border: "1px solid var(--rule)",
            padding: "1.2rem",
            background: "var(--paper-2)",
            display: "inline-block",
            marginBottom: "2.5rem",
          }}
        >
          <div className="mono" style={{ marginBottom: ".5rem", color: "var(--accent)" }}>
            Doğrudan iletişim
          </div>
          <a
            href="mailto:info@trialgrids.com"
            style={{ fontSize: ".85rem", color: "var(--accent-2)", fontFamily: "var(--font-jetbrains-mono)", textDecoration: "none" }}
          >
            info@trialgrids.com
          </a>
        </div>

        <h2>Trialgrids hakkında</h2>
        <p>
          Trialgrids, biyoeşdeğerlik ve biyoyararlanım (BE/BA) çalışmalarında
          deneyimli bir klinik araştırma profesyoneli olan Mehmet Şahin
          tarafından geliştirilmekte ve sürdürülmektedir. Araçlar, BE/BA
          çalışmalarında karşılaşılan günlük zorlukları — manuel Word akışları,
          Excel hack&apos;leri, her hafta araştırma personelinden saatleri
          sessizce çalan tekrarlayan kopyala-yapıştır-değiştir döngülerini —
          gidermek için oluşturuldu.
        </p>
        <p>
          Gaziantep, Türkiye merkezli. Dünya çapında araştırmacılara hizmet
          veriyor.
        </p>

        <h2>Ne beklemelisiniz</h2>
        <p>Yazdığınızda:</p>
        <ul>
          <li><strong>Araçlar hakkında sorular</strong> — kendi klinik araştırma geçmişime dayanarak cevap veririm ve her aracı en iyi şekilde nasıl kullanacağınızı açıklarım</li>
          <li><strong>Özellik önerileri</strong> — her öneri dikkatle okunur. Hepsi özelliğe dönüşmez, ama hepsi yol haritasına katkı sağlar</li>
          <li><strong>Hata raporları</strong> — lütfen tarayıcı sürümünüzü, ne yaptığınızı ve neyin olduğunu ekleyin. Önceliklendirip takip edeceğim</li>
          <li><strong>Ortaklık veya ticari sorgulamalar</strong> — görüşmeye açığım</li>
        </ul>

        <h2>Bu hizmet ne değildir</h2>
        <p>
          Trialgrids 7/24 destek hizmeti değildir. Kurumunuzun doğrulanmış
          sistemlerinin yerine geçmez. Klinik araştırma işinin yanında bir yan
          proje olarak sürdürülen ücretsiz bir araç setidir.
        </p>
        <p>
          Bir düzenleyici başvuru üzerinde çalışıyor ve bir aracın çıktısında
          endişe verici bir şey fark ediyorsanız,{" "}
          <strong>lütfen önce protokolünüzle veya sponsorunuzun veri yönetim
          planıyla doğrulayın</strong>, sonra bana bulduklarınızı bildirin.
        </p>
      </div>
    </>
  );
}
