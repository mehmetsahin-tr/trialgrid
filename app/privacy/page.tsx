"use client";

import { useState } from "react";
import LanguageToggle from "@/app/components/LanguageToggle";

type Lang = "en" | "tr";

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("en");

  return (
    <main style={{ position: "relative" }}>
      <LanguageToggle onChange={setLang} />

      {lang === "en" ? <PrivacyEN /> : <PrivacyTR />}
    </main>
  );
}

function PrivacyEN() {
  return (
    <>
      <div className="hero">
        <h1>Privacy policy.</h1>
        <div className="meta">
          last updated
          <br />
          May 2026
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          Trialgrids is operated by Mehmet Şahin (sole proprietor) under the brand
          &ldquo;Trialgrids&rdquo; (referred to as &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). This policy
          explains how we handle data when you use trialgrids.com and our clinical
          research tools.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          We are based in Gaziantep, Turkey. You can reach us at{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>.
        </p>

        <h2>1. Privacy at a glance</h2>
        <p>Trialgrids is built privacy-first. Here&apos;s a summary:</p>
        <ul>
          <li>We do <strong>not</strong> collect any data you enter into the tools (study codes, subject IDs, randomization parameters, etc.)</li>
          <li>We do <strong>not</strong> use cookies for tracking</li>
          <li>We do <strong>not</strong> sell or share data with third parties</li>
          <li>We do <strong>not</strong> show ads</li>
          <li>All your work stays on your device</li>
        </ul>
        <p>
          We use one privacy-respecting analytics service (Vercel Analytics) to
          understand basic site usage at an aggregate level. Details below.
        </p>

        <h2>2. Data you enter into the tools</h2>
        <p>
          When you use any of our tools (Randomization, Time Table, Meal Log,
          Sample Shipment, Tube Labels), the data you enter — study codes, drug
          names, subject counts, sampling timepoints, and so on — is processed
          entirely in your browser.
        </p>
        <p>
          This data is <strong>never transmitted to us or to any third party</strong>.
          We have no servers that receive it, no databases that store it, and no
          logs that record it.
        </p>
        <p>
          When you close the browser tab, the data in memory is gone. The exception
          is local storage (see next section).
        </p>

        <h2>3. Local storage</h2>
        <p>
          Two of our tools use your browser&apos;s <code>localStorage</code> to
          auto-save your work between sessions, so you don&apos;t lose progress
          when you accidentally close the tab:
        </p>
        <ul>
          <li><strong>Time Table</strong> — saves your timetable structure</li>
          <li><strong>Meal Log</strong> — saves your meal entries</li>
        </ul>
        <p>This data:</p>
        <ul>
          <li>Stays on <strong>your device only</strong></li>
          <li>Is <strong>never sent</strong> to any server</li>
          <li>Can be cleared at any time through your browser settings, or by clicking &ldquo;Clear&rdquo; within the tool itself</li>
        </ul>
        <p>
          The other three tools (Randomization, Sample Shipment, Tube Labels) do{" "}
          <strong>not</strong> use local storage. Each session starts fresh.
        </p>

        <h2>4. Analytics</h2>
        <p>
          We use <strong>Vercel Analytics</strong> to understand how the site is
          used. This service is privacy-respecting:
        </p>
        <ul>
          <li><strong>No cookies</strong> are set</li>
          <li><strong>No personal data</strong> is collected</li>
          <li><strong>No cross-site tracking</strong></li>
          <li>IP addresses are processed for country detection, then immediately discarded</li>
        </ul>
        <p>Vercel Analytics tells us things like:</p>
        <ul>
          <li>How many people visited the home page today</li>
          <li>Which tool pages are most popular</li>
          <li>Which countries our visitors come from (aggregated)</li>
          <li>Which referrers (e.g. LinkedIn, Google) brought people here</li>
        </ul>
        <p>
          This data helps us improve the site. It does <strong>not</strong>{" "}
          identify individual users.
        </p>
        <p>
          You can read Vercel&apos;s privacy practices at{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            vercel.com/legal/privacy-policy
          </a>
          .
        </p>

        <h2>5. Fonts and assets</h2>
        <p>
          All fonts (Fraunces, Inter, JetBrains Mono) and other static assets are
          bundled with the application and served from our own infrastructure.{" "}
          <strong>No connections to third-party font services or CDNs</strong>{" "}
          occur during your visit.
        </p>

        <h2>6. Email correspondence</h2>
        <p>
          If you contact us via <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>,
          your email address and message contents will be stored in our email
          provider&apos;s system (Google Workspace) for the purpose of replying
          to you and maintaining a record of the correspondence.
        </p>
        <p>
          We use this information only to respond to your inquiry. We do not add
          you to mailing lists, share your email with third parties, or use it
          for marketing.
        </p>
        <p>
          You can request deletion of email correspondence at any time by emailing us.
        </p>

        <h2>7. Your rights under KVKK and GDPR</h2>
        <p>
          If you are in Turkey, the Personal Data Protection Law (KVKK No. 6698)
          applies. If you are in the European Union, the General Data Protection
          Regulation (GDPR) applies. Both grant you the following rights:
        </p>
        <ul>
          <li><strong>Right to access</strong> — ask what data we have about you</li>
          <li><strong>Right to rectification</strong> — correct inaccurate data</li>
          <li><strong>Right to erasure</strong> — request deletion of your data</li>
          <li><strong>Right to object</strong> — object to data processing</li>
          <li><strong>Right to data portability</strong> — receive your data in a machine-readable format</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>. We will
          respond within 30 days.
        </p>
        <p>
          You also have the right to lodge a complaint with the relevant
          supervisory authority:
        </p>
        <ul>
          <li><strong>Turkey:</strong> Personal Data Protection Authority (KVKK Kurumu) — <a href="https://www.kvkk.gov.tr" target="_blank" rel="noopener noreferrer">kvkk.gov.tr</a></li>
          <li><strong>EU:</strong> Your local data protection authority</li>
        </ul>

        <h2>8. Children&apos;s privacy</h2>
        <p>
          Trialgrids is intended for use by adults working in clinical research.
          We do not knowingly collect data from children under 18. If you believe
          we have inadvertently collected data from a minor, contact us and we
          will delete it.
        </p>

        <h2>9. Changes to this policy</h2>
        <p>
          We may update this policy when our practices change or when laws change.
          The &ldquo;Last updated&rdquo; date at the top reflects the most recent
          revision. Material changes will be announced on the homepage when feasible.
        </p>

        <h2>10. Contact</h2>
        <p>
          For any questions about this policy or our privacy practices:
        </p>
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

function PrivacyTR() {
  return (
    <>
      <div className="hero">
        <h1>Gizlilik politikası.</h1>
        <div className="meta">
          son güncelleme
          <br />
          Mayıs 2026
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          Trialgrids, &ldquo;Trialgrids&rdquo; markası altında Mehmet Şahin (şahıs
          işletmesi) tarafından işletilmektedir (&ldquo;biz&rdquo;, &ldquo;bize&rdquo;,
          &ldquo;bizim&rdquo; olarak anılacaktır). Bu politika, trialgrids.com
          sitesini ve klinik araştırma araçlarımızı kullandığınızda verilerinizi
          nasıl işlediğimizi açıklar.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          Gaziantep, Türkiye&apos;de bulunuyoruz. Bizimle{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>{" "}
          adresinden iletişime geçebilirsiniz.
        </p>

        <h2>1. Bir bakışta gizlilik</h2>
        <p>Trialgrids gizlilik öncelikli olarak tasarlandı. İşte özet:</p>
        <ul>
          <li>Araçlara girdiğiniz verileri (çalışma kodları, gönüllü kimlikleri, randomizasyon parametreleri vb.) <strong>toplamayız</strong></li>
          <li>Takip amaçlı <strong>çerez kullanmayız</strong></li>
          <li>Verileri üçüncü taraflarla <strong>satmayız veya paylaşmayız</strong></li>
          <li><strong>Reklam göstermeyiz</strong></li>
          <li>Tüm çalışmalarınız cihazınızda kalır</li>
        </ul>
        <p>
          Site kullanımını genel düzeyde anlamak için bir gizlilik dostu analitik
          hizmeti (Vercel Analytics) kullanırız. Detaylar aşağıda.
        </p>

        <h2>2. Araçlara girdiğiniz veriler</h2>
        <p>
          Araçlarımızdan herhangi birini (Randomizasyon, Zaman Çizelgesi, Öğün
          Kaydı, Numune Sevkiyatı, Tüp Etiketleri) kullandığınızda, girdiğiniz
          veriler — çalışma kodları, ilaç adları, gönüllü sayıları, numune zaman
          noktaları vb. — tamamen tarayıcınızda işlenir.
        </p>
        <p>
          Bu veriler <strong>bize veya herhangi bir üçüncü tarafa hiçbir zaman
          iletilmez</strong>. Verilerinizi alan sunucumuz, depolayan veritabanımız
          veya kayıt tutan logumuz yoktur.
        </p>
        <p>
          Tarayıcı sekmesini kapattığınızda, bellekteki veriler silinir. İstisnası
          yerel depolamadır (sonraki bölüme bakın).
        </p>

        <h2>3. Yerel depolama</h2>
        <p>
          İki aracımız, yanlışlıkla sekmeyi kapattığınızda ilerlemenizi
          kaybetmemeniz için tarayıcınızın <code>localStorage</code> özelliğini
          kullanarak çalışmalarınızı oturumlar arasında otomatik kaydeder:
        </p>
        <ul>
          <li><strong>Zaman Çizelgesi</strong> — tablo yapınızı kaydeder</li>
          <li><strong>Öğün Kaydı</strong> — öğün girdilerinizi kaydeder</li>
        </ul>
        <p>Bu veriler:</p>
        <ul>
          <li><strong>Yalnızca cihazınızda</strong> kalır</li>
          <li>Hiçbir sunucuya <strong>gönderilmez</strong></li>
          <li>Tarayıcı ayarlarından veya araç içindeki &ldquo;Temizle&rdquo; butonu ile istediğiniz zaman silinebilir</li>
        </ul>
        <p>
          Diğer üç araç (Randomizasyon, Numune Sevkiyatı, Tüp Etiketleri) yerel
          depolama <strong>kullanmaz</strong>. Her oturum sıfırdan başlar.
        </p>

        <h2>4. Analitik</h2>
        <p>
          Sitenin nasıl kullanıldığını anlamak için <strong>Vercel Analytics</strong>{" "}
          kullanıyoruz. Bu hizmet gizlilik dostudur:
        </p>
        <ul>
          <li><strong>Çerez kullanmaz</strong></li>
          <li><strong>Kişisel veri toplamaz</strong></li>
          <li><strong>Çapraz site takibi yapmaz</strong></li>
          <li>IP adresleri ülke tespiti için işlenir, ardından hemen silinir</li>
        </ul>
        <p>Vercel Analytics bize şunları söyler:</p>
        <ul>
          <li>Bugün ana sayfayı kaç kişi ziyaret etti</li>
          <li>Hangi araç sayfaları en popüler</li>
          <li>Ziyaretçilerimiz hangi ülkelerden geliyor (genel)</li>
          <li>Hangi yönlendiriciler (örn. LinkedIn, Google) insanları buraya getirdi</li>
        </ul>
        <p>
          Bu veriler siteyi geliştirmemize yardımcı olur. Bireysel kullanıcıları{" "}
          <strong>tanımlamaz</strong>.
        </p>
        <p>
          Vercel&apos;in gizlilik uygulamalarını şu adresten okuyabilirsiniz:{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            vercel.com/legal/privacy-policy
          </a>
          .
        </p>

        <h2>5. Yazı tipleri ve varlıklar</h2>
        <p>
          Tüm yazı tipleri (Fraunces, Inter, JetBrains Mono) ve diğer statik
          varlıklar uygulamayla birlikte paketlenmiş ve kendi altyapımızdan
          sunulmaktadır. Ziyaretiniz sırasında <strong>üçüncü taraf yazı tipi
          hizmetlerine veya CDN&apos;lere bağlantı</strong> kurulmaz.
        </p>

        <h2>6. Email yazışmaları</h2>
        <p>
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a> adresinden
          bizimle iletişime geçtiğinizde, e-posta adresiniz ve mesaj içerikleriniz,
          size yanıt vermek ve yazışma kaydını tutmak amacıyla e-posta
          sağlayıcımızın (Google Workspace) sisteminde saklanır.
        </p>
        <p>
          Bu bilgileri yalnızca sorgunuza yanıt vermek için kullanırız. Sizi posta
          listelerine eklemeyiz, e-postanızı üçüncü taraflarla paylaşmayız veya
          pazarlama amaçlı kullanmayız.
        </p>
        <p>
          E-posta yazışmalarının silinmesini istediğiniz zaman e-posta göndererek
          talep edebilirsiniz.
        </p>

        <h2>7. KVKK ve GDPR kapsamındaki haklarınız</h2>
        <p>
          Türkiye&apos;deyseniz, Kişisel Verilerin Korunması Kanunu (KVKK No. 6698)
          geçerlidir. Avrupa Birliği&apos;ndeyseniz, Genel Veri Koruma Yönetmeliği
          (GDPR) geçerlidir. Her ikisi de size aşağıdaki hakları verir:
        </p>
        <ul>
          <li><strong>Erişim hakkı</strong> — hakkınızda hangi verilere sahip olduğumuzu sorma</li>
          <li><strong>Düzeltme hakkı</strong> — yanlış verileri düzeltme</li>
          <li><strong>Silme hakkı</strong> — verilerinizin silinmesini talep etme</li>
          <li><strong>İtiraz hakkı</strong> — veri işlemeye itiraz etme</li>
          <li><strong>Veri taşınabilirliği hakkı</strong> — verilerinizi makine tarafından okunabilir bir formatta alma</li>
        </ul>
        <p>
          Bu haklardan herhangi birini kullanmak için{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a> adresine
          e-posta gönderin. 30 gün içinde yanıt vereceğiz.
        </p>
        <p>
          Ayrıca ilgili denetim otoritesine şikayette bulunma hakkınız vardır:
        </p>
        <ul>
          <li><strong>Türkiye:</strong> Kişisel Verileri Koruma Kurumu (KVKK Kurumu) — <a href="https://www.kvkk.gov.tr" target="_blank" rel="noopener noreferrer">kvkk.gov.tr</a></li>
          <li><strong>AB:</strong> Yerel veri koruma otoriteniz</li>
        </ul>

        <h2>8. Çocukların gizliliği</h2>
        <p>
          Trialgrids, klinik araştırma alanında çalışan yetişkinlerin kullanımına
          yöneliktir. 18 yaşın altındaki çocuklardan bilerek veri toplamayız. Bir
          çocuktan yanlışlıkla veri topladığımıza inanıyorsanız, bizimle iletişime
          geçin, sileceğiz.
        </p>

        <h2>9. Bu politikadaki değişiklikler</h2>
        <p>
          Uygulamalarımız değiştiğinde veya yasalar değiştiğinde bu politikayı
          güncelleyebiliriz. Üstteki &ldquo;Son güncelleme&rdquo; tarihi en son
          revizyonu yansıtır. Mümkün olduğunda önemli değişiklikler ana sayfada
          duyurulacaktır.
        </p>

        <h2>10. İletişim</h2>
        <p>Bu politika veya gizlilik uygulamalarımız hakkında herhangi bir sorunuz için:</p>
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
