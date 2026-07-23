import type { Profile } from "../types";
import { PaperAirplane } from "../components/paperAirplane";
import { Section } from "./section";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark";
      appearance: "interaction-only";
      action: "contact";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
}

const turnstileWindow = window as Window & { turnstile?: TurnstileApi };

function isValidEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254 || /[\r\n\s]/.test(value)) return false;

  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex !== value.indexOf("@")) return false;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1).toLowerCase();
  if (local.length > 64 || domain.length > 253) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return false;

  const topLevelDomain = labels.at(-1) ?? "";
  return /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(topLevelDomain);
}

export class ContactSection extends Section<Profile> {
  private turnstileToken = "";
  private turnstileWidgetId: string | undefined;

  public mount(profile: Profile): void {
    this.setMarkup(`
      <section id="contact" class="section contact" data-accent="yellow" data-section-label="Contact">
        <div class="section-inner contact__inner">
          <p class="section-tag" style="--section-accent: var(--accent-yellow)">// fetch(&quot;/api/contact&quot;)</p>
          <h2 class="section-heading"><span class="stroke-underline">連絡<svg></svg></span></h2>
          <p class="contact__lead">お仕事のご相談、雑談、なんでもお気軽にどうぞ。</p>
          <div class="contact__grid">
            <form class="contact__form" data-contact-form aria-label="${profile.email}宛のお問い合わせフォーム" novalidate>
              <label class="contact__field">
                お名前
                <input type="text" name="name" required />
              </label>
              <label class="contact__field">
                メールアドレス
                <input type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" aria-describedby="contact-email-hint" required />
                <span id="contact-email-hint" class="contact__hint">例: name@example.com</span>
              </label>
              <label class="contact__field">
                メールアドレス（確認）
                <input type="email" name="emailConfirmation" maxlength="254" autocomplete="off" inputmode="email" autocapitalize="none" spellcheck="false" required />
              </label>
              <label class="contact__field">
                メッセージ
                <textarea name="message" rows="4" required></textarea>
              </label>
              <label class="contact__honeypot" aria-hidden="true">
                ウェブサイト
                <input type="text" name="website" tabindex="-1" autocomplete="off" />
              </label>
              <div class="contact__turnstile" data-turnstile aria-label="スパム防止のセキュリティ確認"></div>
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
      const email = this.query<HTMLInputElement>('input[name="email"]');
      const emailConfirmation = this.query<HTMLInputElement>('input[name="emailConfirmation"]');
      if (email && emailConfirmation) {
        const validate = () => this.validateEmailInputs(email, emailConfirmation);
        email.addEventListener("input", validate);
        emailConfirmation.addEventListener("input", validate);
      }
      form.dataset.startedAt = `${Date.now()}`;
      form.addEventListener("submit", (event) => this.handleSubmit(event, form));
      void this.mountTurnstile();
    }
  }

  private async mountTurnstile(): Promise<void> {
    const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    const container = this.query<HTMLElement>("[data-turnstile]");
    const submit = this.query<HTMLButtonElement>(".contact__submit");
    const status = this.query<HTMLElement>("[data-contact-status]");
    if (!container || !submit) return;

    if (!sitekey) {
      submit.disabled = true;
      if (status) status.textContent = "お問い合わせ機能の設定が完了していません。";
      return;
    }

    try {
      await this.loadTurnstileScript();
    } catch {
      submit.disabled = true;
      if (status) status.textContent = "セキュリティ確認を読み込めませんでした。再読み込みしてください。";
      return;
    }
    if (!turnstileWindow.turnstile) {
      submit.disabled = true;
      if (status) status.textContent = "セキュリティ確認を読み込めませんでした。再読み込みしてください。";
      return;
    }

    this.turnstileWidgetId = turnstileWindow.turnstile.render(container, {
      sitekey,
      theme: "dark",
      appearance: "interaction-only",
      action: "contact",
      callback: (token) => {
        this.turnstileToken = token;
        if (status?.textContent?.includes("セキュリティ確認")) status.textContent = "";
      },
      "expired-callback": () => {
        this.turnstileToken = "";
      },
      "error-callback": () => {
        this.turnstileToken = "";
        if (status) status.textContent = "セキュリティ確認に失敗しました。再読み込みしてください。";
      },
    });
  }

  private loadTurnstileScript(): Promise<void> {
    if (turnstileWindow.turnstile) return Promise.resolve();

    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]");
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "";
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
      document.head.appendChild(script);
    });
  }

  private handleSubmit(event: SubmitEvent, form: HTMLFormElement): void {
    event.preventDefault();
    const emailInput = this.query<HTMLInputElement>('input[name="email"]');
    const emailConfirmationInput = this.query<HTMLInputElement>('input[name="emailConfirmation"]');
    if (emailInput && emailConfirmationInput) this.validateEmailInputs(emailInput, emailConfirmationInput);
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const emailConfirmation = String(data.get("emailConfirmation") ?? "");
    const message = String(data.get("message") ?? "");
    const website = String(data.get("website") ?? "");
    const submit = this.query<HTMLButtonElement>(".contact__submit");
    const status = this.query<HTMLElement>("[data-contact-status]");
    if (!this.turnstileToken) {
      if (status) status.textContent = "セキュリティ確認が完了するまでお待ちください。";
      return;
    }
    if (submit) submit.disabled = true;
    if (status) status.textContent = "送信しています…";

    void fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name,
        email,
        emailConfirmation,
        message,
        website,
        startedAt: Number(form.dataset.startedAt ?? 0),
        turnstileToken: this.turnstileToken,
      }),
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
        this.turnstileToken = "";
        if (this.turnstileWidgetId && turnstileWindow.turnstile) {
          turnstileWindow.turnstile.reset(this.turnstileWidgetId);
        }
        if (submit) submit.disabled = false;
      });
  }

  private validateEmailInputs(email: HTMLInputElement, confirmation: HTMLInputElement): void {
    email.setCustomValidity(
      email.value.length === 0 || isValidEmail(email.value.trim()) ? "" : "有効なメールアドレスを入力してください。",
    );
    confirmation.setCustomValidity(
      confirmation.value.length === 0 || email.value.trim() === confirmation.value.trim()
        ? ""
        : "メールアドレスが一致しません。",
    );
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
