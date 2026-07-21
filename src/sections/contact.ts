import type { Profile } from "../types";
import { PaperAirplane } from "../components/paperAirplane";
import { Section } from "./section";

export class ContactSection extends Section<Profile> {
  private profile: Profile | null = null;

  public mount(profile: Profile): void {
    this.profile = profile;

    this.setMarkup(`
      <section id="contact" class="section contact" data-accent="yellow" data-section-label="Contact">
        <div class="section-inner contact__inner">
          <p class="section-tag" style="--section-accent: var(--accent-yellow)">// mailto()</p>
          <h2 class="section-heading"><span class="stroke-underline">おてがみください<svg></svg></span></h2>
          <p class="contact__lead">お仕事のご相談、雑談、なんでもお気軽にどうぞ。</p>
          <div class="contact__grid">
            <form class="contact__form" data-contact-form novalidate>
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
    form?.addEventListener("submit", (event) => this.handleSubmit(event, form));
  }

  private handleSubmit(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    if (!this.profile) return;

    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");

    const planeTemplate = this.query<SVGSVGElement>(".contact__plane");
    if (planeTemplate) {
      const flyingPlane = planeTemplate.cloneNode(true) as HTMLElement;
      const rect = planeTemplate.getBoundingClientRect();
      flyingPlane.style.width = `${rect.width}px`;
      flyingPlane.style.height = `${rect.height}px`;
      document.body.appendChild(flyingPlane);
      new PaperAirplane(flyingPlane).launch();
    }

    const status = this.query<HTMLElement>("[data-contact-status]");
    if (status) status.textContent = "メールソフトを開いています…";

    const subject = encodeURIComponent(`ポートフォリオより: ${name}様からのメッセージ`);
    const body = encodeURIComponent(`${message}\n\n返信先: ${email}`);
    window.location.href = `mailto:${this.profile.email}?subject=${subject}&body=${body}`;

    form.reset();
  }
}
