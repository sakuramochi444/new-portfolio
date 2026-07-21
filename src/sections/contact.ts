import type { Profile } from "../types";
import { PaperAirplane } from "../components/paperAirplane";
import { Section } from "./section";

export class ContactSection extends Section<Profile> {
  public mount(profile: Profile): void {
    this.setMarkup(`
      <section id="contact" class="section contact" data-accent="yellow" data-section-label="Contact">
        <div class="section-inner contact__inner">
          <p class="section-tag" style="--section-accent: var(--accent-yellow)">// fetch(&quot;/api/contact&quot;)</p>
          <h2 class="section-heading"><span class="stroke-underline">おてがみください<svg></svg></span></h2>
          <p class="contact__lead">お仕事のご相談、雑談、なんでもお気軽にどうぞ。</p>
          <div class="contact__grid">
            <form class="contact__form" data-contact-form aria-label="${profile.email}宛のお問い合わせフォーム" novalidate>
              <label class="contact__field">
                お名前
                <input type="text" name="name" required />
              </label>
              <label class="contact__field">
                メールアドレス
                <input type="email" name="email" required />
              </label>
              <label class="contact__field">
                メッセージ
                <textarea name="message" rows="4" required></textarea>
              </label>
              <label class="contact__honeypot" aria-hidden="true">
                ウェブサイト
                <input type="text" name="website" tabindex="-1" autocomplete="off" />
              </label>
              <button type="submit" class="btn-scrawl contact__submit" style="--section-accent: var(--accent-yellow)">
                送信する
                <svg class="contact__plane" viewBox="0 0 60 40" width="34" height="24" aria-hidden="true">
                  <path d="M2,20 L58,4 L38,20 L58,36 Z" fill="var(--accent-yellow)" />
                </svg>
              </button>
              <p class="contact__status" data-contact-status aria-live="polite"></p>
            </form>
          </div>
        </div>
      </section>
    `);

    const form = this.query<HTMLFormElement>("[data-contact-form]");
    if (form) {
      form.dataset.startedAt = `${Date.now()}`;
      form.addEventListener("submit", (event) => this.handleSubmit(event, form));
    }
  }

  private handleSubmit(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");
    const website = String(data.get("website") ?? "");
    const submit = this.query<HTMLButtonElement>(".contact__submit");
    const status = this.query<HTMLElement>("[data-contact-status]");
    if (submit) submit.disabled = true;
    if (status) status.textContent = "送信しています…";

    void fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name, email, message, website, startedAt: Number(form.dataset.startedAt ?? 0) }),
    })
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "送信に失敗しました。");
        this.launchPlane();
        form.reset();
        form.dataset.startedAt = `${Date.now()}`;
        if (status) status.textContent = "送信しました。ありがとうございます。";
      })
      .catch((error: unknown) => {
        if (status) status.textContent = error instanceof Error ? error.message : "送信に失敗しました。";
      })
      .finally(() => {
        if (submit) submit.disabled = false;
      });
  }

  private launchPlane(): void {
    const planeTemplate = this.query<SVGSVGElement>(".contact__plane");
    if (!planeTemplate) return;
    const flyingPlane = planeTemplate.cloneNode(true) as HTMLElement;
    const rect = planeTemplate.getBoundingClientRect();
    flyingPlane.style.width = `${rect.width}px`;
    flyingPlane.style.height = `${rect.height}px`;
    document.body.appendChild(flyingPlane);
    new PaperAirplane(flyingPlane).launch();
  }
}
