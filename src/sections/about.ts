import type { Profile } from "../types";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

export class AboutSection extends Section<Profile> {
  public mount(profile: Profile): void {
    this.setMarkup(`
      <section id="about" class="section about" data-accent="magenta" data-section-label="About">
        <div class="section-inner about__inner">
          <p class="section-tag" style="--section-accent: var(--accent-magenta)">// note.md</p>
          <h2 class="section-heading"><span class="stroke-underline">わたしについて<svg></svg></span></h2>
          <div class="about__grid">
            <article class="pin-card about__card" style="--tilt:-1deg; --pin-color: var(--accent-magenta)">
              ${profile.bio.map((paragraph) => `<p>${paragraph}</p>`).join("")}
            </article>
            <aside class="about__facts">
              <div class="about__fact">
                <span class="tag-pill">BASE</span>
                <p>${profile.location}</p>
              </div>
              <div class="about__fact">
                <span class="tag-pill">CONTACT</span>
                <div class="social-row">
                  ${profile.socials
                    .map((social) => `<a href="${social.url}" target="_blank" rel="noreferrer">${social.label}</a>`)
                    .join("")}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `);

    RevealAnimator.reveal(this.queryAll(".about__card, .about__fact"), { stagger: 0.12 });
  }
}
