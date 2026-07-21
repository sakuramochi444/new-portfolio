import type { ExperienceItem } from "../types";
import { RoughTheme } from "../core/rough";
import { gsap, ScrollTrigger, MotionPreferences } from "../core/motion";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

export class ExperienceSection extends Section<ExperienceItem[]> {
  private static readonly KIND_LABEL: Record<ExperienceItem["kind"], string> = {
    work: "仕事",
    education: "学び",
    milestone: "マイルストーン",
  };

  private resizeTimer = 0;

  public mount(experience: ExperienceItem[]): void {
    this.setMarkup(`
      <section id="experience" class="section experience" data-accent="yellow" data-section-label="Career">
        <div class="section-inner experience__inner">
          <p class="section-tag" style="--section-accent: var(--accent-yellow)">// git log --graph</p>
          <h2 class="section-heading"><span class="stroke-underline">これまでの道<svg></svg></span></h2>
          <div class="experience__timeline">
            <svg class="experience__road" aria-hidden="true"></svg>
            <ul class="experience__list">
              ${experience.map((item, index) => this.renderItem(item, index)).join("")}
            </ul>
          </div>
        </div>
      </section>
    `);

    const timeline = this.query<HTMLElement>(".experience__timeline");
    const roadSvg = this.query<SVGSVGElement>(".experience__road");
    if (timeline && roadSvg) {
      requestAnimationFrame(() => this.drawAndAnimateRoad(timeline, roadSvg));
    }

    RevealAnimator.reveal(this.queryAll("[data-experience-item]"), { stagger: 0.12, y: 36 });

    window.addEventListener("resize", this.handleResize);
  }

  public dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    window.clearTimeout(this.resizeTimer);
    ScrollTrigger.getById("experience-rope")?.kill();
  }

  private readonly handleResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      const timeline = this.query<HTMLElement>(".experience__timeline");
      const roadSvg = this.query<SVGSVGElement>(".experience__road");
      if (timeline && roadSvg) this.drawAndAnimateRoad(timeline, roadSvg);
    }, 200);
  };

  private renderItem(item: ExperienceItem, index: number): string {
    const side = index % 2 === 0 ? "left" : "right";
    return `
      <li class="experience__item experience__item--${side}" data-experience-item>
        <span class="experience__dot" style="--section-accent: var(--accent-cyan)"></span>
        <article class="pin-card experience__card" style="--tilt:${side === "left" ? -0.8 : 0.8}deg; --pin-color: var(--accent-yellow)">
          <p class="experience__period">${item.period}</p>
          <span class="tag-pill">${ExperienceSection.KIND_LABEL[item.kind]}</span>
          <h3 class="experience__title">${item.title}</h3>
          <p class="experience__org">${item.org}</p>
          <p class="experience__description">${item.description}</p>
        </article>
      </li>
    `;
  }

  private drawRoad(svg: SVGSVGElement, height: number): SVGPathElement[] {
    svg.innerHTML = "";
    svg.setAttribute("width", "40");
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("viewBox", `0 0 40 ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    const roughSvg = RoughTheme.createSvg(svg);
    const steps = Math.max(5, Math.ceil(height / 150));
    const stepHeight = height / steps;
    let d = "M20,0 ";
    let currentX = 20;
    for (let i = 1; i <= steps; i++) {
      const y = stepHeight * i;
      const nextX = 20 + Math.sin(i * 1.35) * 4.5;
      const direction = i % 2 === 0 ? 1 : -1;
      d += `C${currentX + direction * 6},${y - stepHeight * 0.72} ${nextX - direction * 6},${y - stepHeight * 0.28} ${nextX},${y} `;
      currentX = nextX;
    }

    const shadow = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#5e4930", strokeWidth: 7, roughness: 1.15, bowing: 0.35 }),
    );
    const rope = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#c9a66b", strokeWidth: 4.5, roughness: 1.35, bowing: 0.45 }),
    );
    const fiber = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#efd5a5", strokeWidth: 1.2, roughness: 1.8, bowing: 0.65 }),
    );
    fiber.setAttribute("transform", "translate(1.5 0)");
    svg.append(shadow, rope, fiber);

    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    paths.forEach((path) => {
      path.style.strokeLinecap = "round";
    });
    return paths;
  }

  private drawAndAnimateRoad(timeline: HTMLElement, roadSvg: SVGSVGElement): void {
    const height = timeline.getBoundingClientRect().height;
    const paths = this.drawRoad(roadSvg, height);
    ScrollTrigger.getById("experience-rope")?.kill();
    if (paths.length === 0 || MotionPreferences.reduced) return;

    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
    });

    gsap.to(paths, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        id: "experience-rope",
        trigger: timeline,
        start: "top 75%",
        end: "bottom 60%",
        scrub: true,
      },
    });
  }
}
