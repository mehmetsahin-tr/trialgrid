"use client";

import { useState } from "react";
import LanguageToggle from "@/app/components/LanguageToggle";

type Lang = "en" | "tr";

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>("en");

  return (
    <main style={{ position: "relative" }}>
      <LanguageToggle onChange={setLang} />

      {lang === "en" ? <TermsEN /> : <TermsTR />}
    </main>
  );
}

function TermsEN() {
  return (
    <>
      <div className="hero">
        <h1>Terms of use.</h1>
        <div className="meta">
          last updated
          <br />
          May 2026
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          These terms govern your use of trialgrids.com and all tools provided
          on the site. Trialgrids is operated by Mehmet Şahin (sole proprietor)
          under the brand &ldquo;Trialgrids&rdquo; (referred to as &ldquo;we&rdquo;,
          &ldquo;our&rdquo;, &ldquo;us&rdquo;), based in Gaziantep, Turkey.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          By using Trialgrids, you agree to these terms. If you do not agree,
          please do not use the service.
        </p>

        <h2>1. Acceptance and changes</h2>
        <p>
          By accessing trialgrids.com and using any of our tools, you accept
          these terms in full. We may update these terms from time to time to
          reflect changes in the service, technology, or applicable law. The
          &ldquo;Last updated&rdquo; date at the top of this page reflects the
          most recent revision. Continued use after changes constitutes acceptance.
        </p>
        <p>
          We will announce material changes on the homepage when feasible.
        </p>

        <h2>2. The service is a documentation aid</h2>
        <p>
          Trialgrids provides browser-based tools to help clinical research
          professionals generate documents commonly needed in bioequivalence
          and bioavailability (BE/BA) studies — randomization lists, time tables,
          meal logs, sample shipment counts, and tube labels.
        </p>
        <p><strong>Trialgrids is a documentation aid. It is not:</strong></p>
        <ul>
          <li>A medical device</li>
          <li>A clinical data management system (CDMS)</li>
          <li>An electronic data capture (EDC) system</li>
          <li>A substitute for your institution&apos;s validated systems</li>
          <li>Intended for primary capture of patient data</li>
        </ul>
        <p>
          You should always follow your sponsor&apos;s data management plan,
          your institution&apos;s standard operating procedures, and applicable
          regulations including:
        </p>
        <ul>
          <li>ICH E6 (R2/R3) Good Clinical Practice</li>
          <li>21 CFR Part 11 (where relevant)</li>
          <li>EU Annex 11 (where relevant)</li>
          <li>GDPR / HIPAA / KVKK (depending on your jurisdiction)</li>
          <li>Local pharmaceutical regulatory requirements (e.g. TİTCK guidelines in Turkey)</li>
        </ul>

        <h2>3. No warranty</h2>
        <p>
          The service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;</strong> without any warranty of any kind, express
          or implied. We do not warrant that:
        </p>
        <ul>
          <li>The service will be uninterrupted, error-free, or available at any specific time</li>
          <li>The outputs (PDFs, schedules, randomization lists, labels) are free from defects or errors</li>
          <li>The service will meet your specific requirements</li>
          <li>Defects, if any, will be corrected</li>
        </ul>
        <p>
          <strong>You are responsible for verifying all outputs before using
          them in a clinical context.</strong> Cross-check randomization lists
          for proper allocation. Verify time tables against your protocol.
          Confirm tube label dimensions against your physical label sheets.
          Compare sample shipment counts against your study design.
        </p>

        <h2>4. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law,{" "}
          <strong>Mehmet Şahin and Trialgrids shall not be liable</strong> for
          any direct, indirect, incidental, consequential, special, or punitive
          damages arising from or related to:
        </p>
        <ul>
          <li>Your use of the service</li>
          <li>Inability to use the service</li>
          <li>Errors or inaccuracies in outputs</li>
          <li>Decisions made based on outputs</li>
          <li>Loss of data, profits, or business opportunities</li>
          <li>Any third-party services integrated with or referenced by Trialgrids (e.g. Vercel, Google Workspace)</li>
        </ul>
        <p>
          This limitation applies regardless of the legal theory (contract,
          tort, negligence, etc.) and even if we have been advised of the
          possibility of such damages.
        </p>

        <h2>5. Your use of the service</h2>
        <p>You agree to:</p>
        <ul>
          <li>Use Trialgrids only for lawful purposes</li>
          <li>Not attempt to reverse engineer, scrape, or systematically download content</li>
          <li>Not interfere with the operation of the site (e.g. attempting denial-of-service attacks)</li>
          <li>Not use the service in any way that could damage or impair the service or its availability for other users</li>
        </ul>

        <h2>6. Intellectual property</h2>
        <p>
          The Trialgrids name, brand, design, code, and content are the property
          of Mehmet Şahin operating under the brand &ldquo;Trialgrids&rdquo;.
          The repository is currently private.
        </p>
        <p>
          <strong>Content you generate using the tools belongs to you.</strong>{" "}
          This includes:
        </p>
        <ul>
          <li>Randomization lists</li>
          <li>Time tables</li>
          <li>Meal logs</li>
          <li>Sample shipment reports</li>
          <li>Tube label PDFs</li>
        </ul>
        <p>
          We claim no rights over the documents you create. You are free to
          use them in any way consistent with your professional obligations
          and applicable regulations.
        </p>

        <h2>7. Email correspondence</h2>
        <p>
          When you contact us at{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>, your
          email becomes part of our correspondence record. We may reference
          your message when responding to ensure context, but we do not publish,
          quote, or share email contents publicly without explicit permission.
        </p>
        <p>
          You retain ownership of your email contents. We retain rights to
          internal records of the correspondence for support and continuity
          purposes.
        </p>

        <h2>8. Privacy</h2>
        <p>
          Your privacy is governed by our <a href="/privacy">Privacy Policy</a>.
          The Privacy Policy is incorporated into these terms by reference.
        </p>

        <h2>9. Governing law and jurisdiction</h2>
        <p>
          These terms are governed by the laws of the Republic of Turkey. Any
          dispute arising from your use of Trialgrids shall be resolved by the
          courts and enforcement offices of <strong>Gaziantep, Turkey</strong>.
        </p>
        <p>
          If you are a consumer based in the European Union, mandatory consumer
          protection laws of your country of residence may also apply.
        </p>

        <h2>10. Severability</h2>
        <p>
          If any provision of these terms is found to be invalid or unenforceable,
          the remaining provisions will continue in full force and effect.
        </p>

        <h2>11. Contact</h2>
        <p>For questions about these terms:</p>
        <p>
          <strong>Mehmet Şahin</strong> (operator of Trialgrids)
          <br />
          Email: <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>
          <br />
          Response time: within 1 business day
        </p>
      </div>
    </>
  );
}

function TermsTR() {
  return (
    <>
      <div className="hero">
        <h1>Kullanım şartları.</h1>
        <div className="meta">
          son güncelleme
          <br />
          Mayıs 2026
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          Bu şartlar, trialgrids.com&apos;u ve sitede sunulan tüm araçları
          kullanımınızı düzenler. Trialgrids, Gaziantep, Türkiye merkezli olarak
          &ldquo;Trialgrids&rdquo; markası altında Mehmet Şahin (şahıs işletmesi)
          tarafından işletilmektedir (&ldquo;biz&rdquo;, &ldquo;bize&rdquo;,
          &ldquo;bizim&rdquo; olarak anılacaktır).
        </p>
        <p style={{ marginBottom: "2rem" }}>
          Trialgrids&apos;i kullanarak bu şartları kabul etmiş olursunuz. Kabul
          etmiyorsanız, lütfen hizmeti kullanmayın.
        </p>

        <h2>1. Kabul ve değişiklikler</h2>
        <p>
          trialgrids.com&apos;a erişerek ve araçlarımızdan herhangi birini
          kullanarak, bu şartları tam olarak kabul etmiş olursunuz. Hizmetteki,
          teknolojideki veya uygulanabilir yasalardaki değişiklikleri yansıtmak
          için bu şartları zaman zaman güncelleyebiliriz. Üstteki &ldquo;Son
          güncelleme&rdquo; tarihi en son revizyonu yansıtır. Değişikliklerden
          sonra kullanıma devam etmek kabul anlamına gelir.
        </p>
        <p>Mümkün olduğunda önemli değişiklikleri ana sayfada duyuracağız.</p>

        <h2>2. Hizmet bir dokümantasyon aracıdır</h2>
        <p>
          Trialgrids, biyoeşdeğerlik ve biyoyararlanım (BE/BA) çalışmalarında
          yaygın olarak gereken belgeleri — randomizasyon listeleri, zaman
          çizelgeleri, öğün kayıtları, numune sevkiyat sayımları ve tüp etiketleri
          — oluşturmaya yardımcı olmak için klinik araştırma profesyonellerine
          yönelik tarayıcı tabanlı araçlar sunar.
        </p>
        <p><strong>Trialgrids bir dokümantasyon aracıdır. Şunlar değildir:</strong></p>
        <ul>
          <li>Tıbbi cihaz</li>
          <li>Klinik veri yönetim sistemi (CDMS)</li>
          <li>Elektronik veri yakalama (EDC) sistemi</li>
          <li>Kurumunuzun doğrulanmış sistemlerinin yerine geçen bir araç</li>
          <li>Hasta verilerinin birincil yakalanması için tasarlanmış</li>
        </ul>
        <p>
          Sponsorunuzun veri yönetim planına, kurumunuzun standart operasyon
          prosedürlerine ve aşağıdakiler dahil olmak üzere uygulanabilir tüm
          düzenlemelere her zaman uymalısınız:
        </p>
        <ul>
          <li>ICH E6 (R2/R3) İyi Klinik Uygulamaları</li>
          <li>21 CFR Part 11 (geçerli olduğunda)</li>
          <li>EU Annex 11 (geçerli olduğunda)</li>
          <li>GDPR / HIPAA / KVKK (yargı bölgenize bağlı olarak)</li>
          <li>Yerel ilaç düzenleyici gereksinimleri (örn. Türkiye&apos;de TİTCK kılavuzları)</li>
        </ul>

        <h2>3. Garanti yok</h2>
        <p>
          Hizmet <strong>&ldquo;olduğu gibi&rdquo; ve &ldquo;kullanılabildiği
          şekilde&rdquo;</strong>, açık veya zımni hiçbir garanti olmaksızın
          sunulur. Şunları garanti etmeyiz:
        </p>
        <ul>
          <li>Hizmetin kesintisiz, hatasız veya belirli bir zamanda kullanılabilir olacağı</li>
          <li>Çıktıların (PDF&apos;ler, çizelgeler, randomizasyon listeleri, etiketler) kusur veya hatalardan arınmış olduğu</li>
          <li>Hizmetin özel gereksinimlerinizi karşılayacağı</li>
          <li>Varsa kusurların düzeltileceği</li>
        </ul>
        <p>
          <strong>Klinik bir bağlamda kullanmadan önce tüm çıktıları doğrulamak
          sizin sorumluluğunuzdadır.</strong> Randomizasyon listelerini doğru
          tahsis için çapraz kontrol edin. Zaman çizelgelerini protokolünüze
          göre doğrulayın. Tüp etiket boyutlarını fiziksel etiket sayfalarınıza
          karşı onaylayın. Numune sevkiyat sayımlarını çalışma tasarımınızla
          karşılaştırın.
        </p>

        <h2>4. Sorumluluk sınırlaması</h2>
        <p>
          Uygulanabilir yasaların izin verdiği azami ölçüde,{" "}
          <strong>Mehmet Şahin ve Trialgrids</strong> aşağıdakilerden kaynaklanan
          veya bunlarla ilgili herhangi bir doğrudan, dolaylı, arızi, sonuç
          olarak ortaya çıkan, özel veya cezai zararlardan{" "}
          <strong>sorumlu olmayacaktır</strong>:
        </p>
        <ul>
          <li>Hizmeti kullanımınız</li>
          <li>Hizmeti kullanamamanız</li>
          <li>Çıktılardaki hatalar veya yanlışlıklar</li>
          <li>Çıktılara dayalı olarak alınan kararlar</li>
          <li>Veri, kâr veya iş fırsatlarının kaybı</li>
          <li>Trialgrids ile entegre edilmiş veya bunun tarafından referans verilen herhangi bir üçüncü taraf hizmet (örn. Vercel, Google Workspace)</li>
        </ul>
        <p>
          Bu sınırlama, yasal teori ne olursa olsun (sözleşme, haksız fiil,
          ihmal vb.) ve böyle zararların olasılığı konusunda bilgilendirilmiş
          olsak bile geçerlidir.
        </p>

        <h2>5. Hizmeti kullanımınız</h2>
        <p>Şunları kabul ediyorsunuz:</p>
        <ul>
          <li>Trialgrids&apos;i yalnızca yasal amaçlar için kullanmak</li>
          <li>Tersine mühendislik yapmamak, scrape etmemek veya içeriği sistematik olarak indirmemek</li>
          <li>Sitenin işleyişine müdahale etmemek (örn. hizmet reddi saldırıları girişiminde bulunmamak)</li>
          <li>Hizmeti veya başka kullanıcılar için kullanılabilirliğini zarara uğratabilecek veya bozabilecek şekilde kullanmamak</li>
        </ul>

        <h2>6. Fikri mülkiyet</h2>
        <p>
          Trialgrids adı, markası, tasarımı, kodu ve içeriği &ldquo;Trialgrids&rdquo;
          markası altında işletilen Mehmet Şahin&apos;in mülkiyetindedir. Kaynak
          kodu deposu şu anda özeldir.
        </p>
        <p>
          <strong>Araçları kullanarak oluşturduğunuz içerik size aittir.</strong>{" "}
          Bu şunları içerir:
        </p>
        <ul>
          <li>Randomizasyon listeleri</li>
          <li>Zaman çizelgeleri</li>
          <li>Öğün kayıtları</li>
          <li>Numune sevkiyat raporları</li>
          <li>Tüp etiketi PDF&apos;leri</li>
        </ul>
        <p>
          Oluşturduğunuz belgeler üzerinde herhangi bir hak iddia etmiyoruz.
          Profesyonel yükümlülüklerinizle ve uygulanabilir düzenlemelerle
          tutarlı herhangi bir şekilde kullanmakta özgürsünüz.
        </p>

        <h2>7. Email yazışmaları</h2>
        <p>
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>{" "}
          adresinden bizimle iletişime geçtiğinizde, e-postanız yazışma
          kaydımızın bir parçası olur. Yanıt verirken bağlamı sağlamak için
          mesajınıza referans verebiliriz, ancak açık izin olmadan e-posta
          içeriklerini kamuya yayınlamayız, alıntılamayız veya paylaşmayız.
        </p>
        <p>
          E-posta içeriklerinin sahipliği size aittir. Yazışmanın iç kayıtlarını
          destek ve süreklilik amaçları için tutma hakkımızı saklı tutarız.
        </p>

        <h2>8. Gizlilik</h2>
        <p>
          Gizliliğiniz <a href="/privacy">Gizlilik Politikamız</a> tarafından
          düzenlenir. Gizlilik Politikası, referans yoluyla bu şartlara dahil
          edilmiştir.
        </p>

        <h2>9. Yargı yetkisi ve uygulanacak hukuk</h2>
        <p>
          Bu şartlar Türkiye Cumhuriyeti yasalarına tabidir. Trialgrids
          kullanımınızdan kaynaklanan herhangi bir uyuşmazlık{" "}
          <strong>Gaziantep, Türkiye</strong> mahkemeleri ve icra daireleri
          tarafından çözülecektir.
        </p>
        <p>
          Avrupa Birliği&apos;nde bulunan bir tüketici iseniz, ikamet ettiğiniz
          ülkenin zorunlu tüketici koruma yasaları da geçerli olabilir.
        </p>

        <h2>10. Bölünebilirlik</h2>
        <p>
          Bu şartların herhangi bir hükmü geçersiz veya uygulanamaz bulunursa,
          kalan hükümler tam olarak yürürlükte kalmaya devam edecektir.
        </p>

        <h2>11. İletişim</h2>
        <p>Bu şartlar hakkında sorular için:</p>
        <p>
          <strong>Mehmet Şahin</strong> (Trialgrids işletmecisi)
          <br />
          E-posta: <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>
          <br />
          Yanıt süresi: 1 iş günü içinde
        </p>
      </div>
    </>
  );
}
