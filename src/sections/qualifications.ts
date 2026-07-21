import type { Qualification } from "../types";
import { RoughTheme } from "../core/rough";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

const TILTS = [-1.4, 1.1, -0.9, 1.6];

export class QualificationsSection extends Section<Qualification[]> {
  public mount(qualifications: Qualification[]): void {
    this.setMarkup(`
      <section id="qualifications" class="section qualifications" data-accent="cyan" data-section-label="Licenses">
        <div class="section-inner qualifications__inner">
          <p class="section-tag" style="--section-accent: var(--accent-cyan)">// licenses.json</p>
          <h2 class="section-heading"><span class="stroke-underline">資格・免許<svg></svg></span></h2>
          <div class="qualifications__grid">
            ${qualifications.map((q, index) => this.renderCard(q, TILTS[index % TILTS.length])).join("")}
          </div>
        </div>
      </section>
    `);

    this.queryAll<SVGSVGElement>("[data-seal]").forEach((svg) => {
      const accent = svg.dataset.sealAccent as Qualification["accent"];
      this.drawSeal(svg, accent);
    });

    RevealAnimator.reveal(this.queryAll(".qualification-card"), { stagger: 0.1 });
  }

  private renderCard(qualification: Qualification, tilt: number): string {
    return `
      <article class="pin-card qualification-card" style="--tilt:${tilt}deg; --pin-color: var(--accent-${qualification.accent})">
        <svg class="qualification-card__seal" data-seal data-seal-accent="${qualification.accent}" viewBox="0 0 64 76" aria-hidden="true"></svg>
        <div class="qualification-card__body">
          <h3 class="qualification-card__name">${qualification.name}</h3>
          <p class="qualification-card__date">${qualification.date} 取得</p>
        </div>
      </article>
    `;
  }

  private drawSeal(svg: SVGSVGElement, accent: Qualification["accent"]): void {
    const roughSvg = RoughTheme.createSvg(svg);
    const color = RoughTheme.accentColor(accent);

    const medallion = roughSvg.circle(32, 28, 44, RoughTheme.options({ fill: color, fillStyle: "hachure", stroke: color, strokeWidth: 2 }));
    const leftRibbon = roughSvg.line(20, 48, 13, 71, RoughTheme.options({ stroke: color, strokeWidth: 3, roughness: 1.6 }));
    const rightRibbon = roughSvg.line(44, 48, 51, 71, RoughTheme.options({ stroke: color, strokeWidth: 3, roughness: 1.6 }));
    const check = roughSvg.linearPath(
      [
        [21, 28],
        [28, 36],
        [45, 16],
      ],
      RoughTheme.options({ stroke: "#12161d", strokeWidth: 3, roughness: 1 }),
    );

    svg.append(medallion, leftRibbon, rightRibbon, check);
  }
}
