import type { Profile } from "../types";
import { gsap, MotionPreferences } from "../core/motion";
import { DraggableStickyNote } from "../components/stickyNote";
import { Section } from "./section";

export class HeroSection extends Section<Profile> {
  private note: DraggableStickyNote | null = null;

  public mount(profile: Profile): void {
    this.setMarkup(`
      <section id="hero" class="section hero" data-accent="cyan" data-section-label="Top">
        <div class="section-inner hero__inner">
          <p class="section-tag" style="--section-accent: var(--accent-cyan)">// portfolio.ts — persona loaded</p>
          <h1 class="hero__name">
            <span class="hero__name-mask">
              <span class="hero__name-text">${profile.name}</span>
              <span class="hero__pen" aria-hidden="true"></span>
            </span>
          </h1>
          <p class="hero__reading">${profile.nameReading} ・ ${profile.role}</p>
          <div class="hero__tagline-wrap" data-note-anchor>
            <div class="sticky-note hero__tagline" data-accent="yellow" style="--note-color:#ffd94a;">
              ${profile.tagline}
            </div>
          </div>
          <div class="hero__meta">
            <span>${profile.location}</span>
            <span class="hero__scroll-cue">Scroll ↓ つづきを見る</span>
          </div>
        </div>
      </section>
    `);

    this.animateNameReveal();
    this.mountStickyNote();
  }

  private animateNameReveal(): void {
    const nameMask = this.query<HTMLElement>(".hero__name-mask");
    if (!nameMask) return;

    if (MotionPreferences.reduced) {
      nameMask.style.setProperty("--reveal", "1");
      return;
    }

    gsap.fromTo(
      nameMask,
      { "--reveal": 0 },
      {
        "--reveal": 1,
        duration: 1.5,
        ease: "power2.inOut",
        delay: 0.3,
        onComplete: () => {
          const pen = nameMask.querySelector<HTMLElement>(".hero__pen");
          if (pen) gsap.to(pen, { opacity: 0, duration: 0.5 });
        },
      },
    );
  }

  private mountStickyNote(): void {
    const note = this.query<HTMLElement>(".hero__tagline");
    const anchor = this.query<HTMLElement>("[data-note-anchor]");
    if (note && anchor) {
      this.note = new DraggableStickyNote(note, anchor);
    }
  }

  public dispose(): void {
    this.note?.dispose();
  }
}
