import type { Skill } from "../types";
import { RoughTheme } from "../core/rough";
import { gsap, ScrollTrigger, MotionPreferences } from "../core/motion";
import { Section } from "./section";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface SkillsSectionProps {
  skills: Skill[];
  personaName: string;
}

interface LaidOutSkill extends Skill {
  x: number;
  y: number;
}

interface LaidOutCategory {
  label: string;
  skills: LaidOutSkill[];
}

export class SkillsSection extends Section<SkillsSectionProps> {
  private static readonly CATEGORY_LABEL: Record<Skill["category"], string> = {
    language: "言語",
    framework: "フレームワーク",
    infra: "インフラ",
    tool: "ツール",
    other: "その他",
  };

  private static readonly VIEW_W = 1360;
  private static readonly VIEW_H = 1360;
  private static readonly CENTER = { x: 680, y: 680 };
  private static readonly CATEGORY_SIZE = { width: 250, height: 110 };
  private static readonly ROLL_DISTANCE = SkillsSection.VIEW_W * 1.15;
  private static readonly ROLL_ROTATION = 165;

  private activeCategoryIndex = 0;

  public mount({ skills }: SkillsSectionProps): void {
    const categories = this.layoutSkills(skills);
    this.activeCategoryIndex = 0;

    this.setMarkup(`
      <section id="skills" class="section skills" data-accent="cyan" data-section-label="Skills">
        <div class="section-inner skills__inner">
          <p class="section-tag" style="--section-accent: var(--accent-cyan)">// skills.map(s =&gt; s.confidence)</p>
          <h2 class="section-heading"><span class="stroke-underline">得意なこと<svg></svg></span></h2>
          <p class="skills__hint">
            <span class="skills__hint-desktop">左右のボタンやスワイプでカテゴリを回転できます。</span>
            <span class="skills__hint-mobile">スマートフォンでは一覧で表示しています。</span>
          </p>
          <div class="skills__carousel">
            <div class="skills__board" tabindex="0" aria-label="スキルカテゴリのカルーセル">
              <svg class="skills__svg" viewBox="0 0 ${SkillsSection.VIEW_W} ${SkillsSection.VIEW_H}" preserveAspectRatio="xMidYMid meet"></svg>
              <div class="skills__note" data-skills-note hidden></div>
            </div>
            <div class="skills__controls" aria-label="スキルカテゴリを切り替える">
              <button type="button" class="skills__control" data-skills-prev aria-label="前のカテゴリ">←</button>
              <p class="skills__current" aria-live="polite">
                <span data-skills-current>${categories[0]?.label ?? ""}</span>
                <span class="skills__count" data-skills-count>1 / ${categories.length}</span>
              </p>
              <button type="button" class="skills__control" data-skills-next aria-label="次のカテゴリ">→</button>
            </div>
          </div>
          ${this.renderMobileList(skills)}
        </div>
      </section>
    `);

    const svg = this.query<SVGSVGElement>(".skills__svg");
    const noteEl = this.query<HTMLElement>("[data-skills-note]");
    const board = this.query<HTMLElement>(".skills__board");
    const section = this.query<HTMLElement>("#skills");
    if (!svg || !noteEl || !board || !section) return;

    this.drawGraph(svg, categories);
    this.wireInteractions(svg, noteEl, board, categories);
    this.animateEntrance(svg, section);
  }

  private renderMobileList(skills: Skill[]): string {
    const categories = Array.from(new Set(skills.map((skill) => skill.category)));

    return `
      <div class="skills__mobile-list">
        ${categories
          .map(
            (category) => `
              <section class="pin-card skills__mobile-category" style="--tilt:0deg; --pin-color:var(--accent-cyan)">
                <h3 class="skills__mobile-title">${SkillsSection.CATEGORY_LABEL[category]}</h3>
                <div class="skills__mobile-items">
                  ${skills
                    .filter((skill) => skill.category === category)
                    .map(
                      (skill) => `
                        <div class="skills__mobile-item" style="--skill-accent:var(--accent-${skill.accent})">
                          <p class="skills__mobile-name">${skill.name}</p>
                          <p class="skills__mobile-note">${skill.note}</p>
                        </div>
                      `,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </div>
    `;
  }

  private layoutSkills(skills: Skill[]): LaidOutCategory[] {
    const categories = Array.from(new Set(skills.map((skill) => skill.category)));

    return categories.map((category) => {
      const skillsInCategory = skills.filter((skill) => skill.category === category);
      const itemCount = skillsInCategory.length;
      const radiusRange =
        itemCount <= 4 ? { min: 330, max: 375 } : itemCount <= 5 ? { min: 365, max: 415 } : { min: 410, max: 470 };
      const balancedOffset = itemCount % 2 === 0 ? -Math.PI / 4 : -Math.PI / 2;
      const angleOffset = balancedOffset + this.randomBetween(-0.035, 0.035);
      const laidOutSkills = skillsInCategory.map((skill, skillIndex) => {
        const angle = angleOffset + (skillIndex / skillsInCategory.length) * Math.PI * 2;
        const skillRadius = this.randomBetween(radiusRange.min, radiusRange.max);
        return {
          ...skill,
          x: SkillsSection.CENTER.x + Math.cos(angle) * skillRadius,
          y: SkillsSection.CENTER.y + Math.sin(angle) * skillRadius,
        };
      });

      return { label: SkillsSection.CATEGORY_LABEL[category], skills: laidOutSkills };
    });
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private makeLabel(x: number, y: number, text: string, className: string): SVGTextElement {
    const el = document.createElementNS(SVG_NS, "text");
    el.setAttribute("x", `${x}`);
    el.setAttribute("y", `${y}`);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("dominant-baseline", "middle");
    el.setAttribute("class", className);
    el.textContent = text;
    return el;
  }

  private getNodeSize(skill: LaidOutSkill, itemCount: number): number {
    const sparseCategoryBonus = itemCount <= 4 ? 14 : itemCount <= 5 ? 8 : 0;
    return 72 + skill.level * 8 + sparseCategoryBonus;
  }

  private getThreadEndpoints(skill: LaidOutSkill, nodeSize: number): {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } {
    const dx = skill.x - SkillsSection.CENTER.x;
    const dy = skill.y - SkillsSection.CENTER.y;
    const distance = Math.hypot(dx, dy) || 1;
    const unitX = dx / distance;
    const unitY = dy / distance;
    const categoryRadiusX = SkillsSection.CATEGORY_SIZE.width / 2;
    const categoryRadiusY = SkillsSection.CATEGORY_SIZE.height / 2;
    const edgeDistance =
      1 / Math.sqrt((unitX * unitX) / (categoryRadiusX * categoryRadiusX) + (unitY * unitY) / (categoryRadiusY * categoryRadiusY));
    const skillRadius = nodeSize / 2;

    return {
      startX: SkillsSection.CENTER.x + unitX * edgeDistance,
      startY: SkillsSection.CENTER.y + unitY * edgeDistance,
      endX: skill.x - unitX * skillRadius,
      endY: skill.y - unitY * skillRadius,
    };
  }

  private drawGraph(svg: SVGSVGElement, categories: LaidOutCategory[]): void {
    const roughSvg = RoughTheme.createSvg(svg);

    categories.forEach((category, categoryIndex) => {
      const slide = document.createElementNS(SVG_NS, "g");
      slide.setAttribute("class", "skills__category-slide");
      slide.setAttribute("aria-hidden", `${categoryIndex !== 0}`);
      slide.dataset.categoryIndex = `${categoryIndex}`;
      slide.style.opacity = "1";
      slide.style.visibility = categoryIndex === 0 ? "visible" : "hidden";
      slide.classList.toggle("is-active", categoryIndex === 0);

      category.skills.forEach((skill) => {
        const nodeSize = this.getNodeSize(skill, category.skills.length);
        const endpoints = this.getThreadEndpoints(skill, nodeSize);
        const skillLine = roughSvg.line(
          endpoints.startX,
          endpoints.startY,
          endpoints.endX,
          endpoints.endY,
          RoughTheme.options({ stroke: RoughTheme.accentColor(skill.accent), strokeWidth: 2.2, roughness: 2.2 }),
        );
        slide.appendChild(skillLine);
      });

      const categoryNode = roughSvg.ellipse(
        SkillsSection.CENTER.x,
        SkillsSection.CENTER.y,
        SkillsSection.CATEGORY_SIZE.width,
        SkillsSection.CATEGORY_SIZE.height,
        RoughTheme.options({ fill: "#1b212c", fillStyle: "solid", stroke: "#9aa4b4", strokeWidth: 2.5 }),
      );
      slide.appendChild(categoryNode);
      slide.appendChild(
        this.makeLabel(
          SkillsSection.CENTER.x,
          SkillsSection.CENTER.y,
          category.label,
          "skills__label skills__label--active-category",
        ),
      );

      category.skills.forEach((skill) => {
        const nodeSize = this.getNodeSize(skill, category.skills.length);

        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("class", "skills__node");
        group.setAttribute("tabindex", "0");
        group.dataset.note = skill.note;
        group.dataset.name = skill.name;

        const circle = roughSvg.circle(
          skill.x,
          skill.y,
          nodeSize,
          RoughTheme.options({
            fill: RoughTheme.accentColor(skill.accent),
            fillStyle: "hachure",
            hachureGap: 3,
            stroke: RoughTheme.accentColor(skill.accent),
            strokeWidth: 2,
          }),
        );

        // rough.js hachure fill is mostly empty space between sketchy lines,
        // so give the node a solid (invisible) hit target for reliable hover/click.
        const hitTarget = document.createElementNS(SVG_NS, "circle");
        hitTarget.setAttribute("cx", `${skill.x}`);
        hitTarget.setAttribute("cy", `${skill.y}`);
        hitTarget.setAttribute("r", `${nodeSize / 2 + 6}`);
        hitTarget.setAttribute("fill", "transparent");

        group.appendChild(hitTarget);
        group.appendChild(circle);
        group.appendChild(this.makeLabel(skill.x, skill.y, skill.name, "skills__label skills__label--skill"));
        slide.appendChild(group);
      });

      svg.appendChild(slide);
    });
  }

  private showNote(board: HTMLElement, noteEl: HTMLElement, node: SVGGElement): void {
    if (board.classList.contains("is-dragging")) return;
    noteEl.textContent = `${node.dataset.name}: ${node.dataset.note}`;
    noteEl.hidden = false;
    const box = node.getBoundingClientRect();
    const boardBox = board.getBoundingClientRect();
    const relativeTop = box.top - boardBox.top;
    const showBelow = box.top < 90;
    noteEl.classList.toggle("skills__note--below", showBelow);
    noteEl.style.left = `${box.left - boardBox.left + box.width / 2}px`;
    noteEl.style.top = `${showBelow ? box.bottom - boardBox.top : relativeTop}px`;
    gsap.fromTo(noteEl, { opacity: 0, y: showBelow ? -6 : 6 }, { opacity: 1, y: 0, duration: 0.25 });
  }

  private wireInteractions(
    svg: SVGSVGElement,
    noteEl: HTMLElement,
    board: HTMLElement,
    categories: LaidOutCategory[],
  ): void {
    svg.querySelectorAll<SVGGElement>(".skills__node").forEach((node) => {
      node.addEventListener("pointerenter", () => this.showNote(board, noteEl, node));
      node.addEventListener("focus", () => this.showNote(board, noteEl, node));
      node.addEventListener("pointerleave", () => {
        noteEl.hidden = true;
      });
      node.addEventListener("blur", () => {
        noteEl.hidden = true;
      });
    });

    const previous = this.query<HTMLButtonElement>("[data-skills-prev]");
    const next = this.query<HTMLButtonElement>("[data-skills-next]");
    previous?.addEventListener("click", () => this.rotateCategory(svg, categories, noteEl, -1));
    next?.addEventListener("click", () => this.rotateCategory(svg, categories, noteEl, 1));

    board.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.rotateCategory(svg, categories, noteEl, event.key === "ArrowRight" ? 1 : -1);
    });

    let pointerStartX: number | null = null;
    board.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary) return;
      pointerStartX = event.clientX;
      board.classList.add("is-dragging");
      board.setPointerCapture(event.pointerId);
      noteEl.hidden = true;
    });
    board.addEventListener("pointermove", (event) => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      const activeSlide = svg.querySelector<SVGGElement>(".skills__category-slide.is-active");
      if (!activeSlide) return;
      const translatedDistance = distance * (SkillsSection.VIEW_W / Math.max(board.clientWidth, 1));
      gsap.set(activeSlide, {
        x: translatedDistance,
        rotation: (translatedDistance / SkillsSection.ROLL_DISTANCE) * SkillsSection.ROLL_ROTATION,
        transformOrigin: "center",
      });
    });
    board.addEventListener("pointerup", (event) => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      board.classList.remove("is-dragging");
      if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
      if (Math.abs(distance) < 50) {
        const activeSlide = svg.querySelector<SVGGElement>(".skills__category-slide.is-active");
        if (activeSlide) gsap.to(activeSlide, { x: 0, rotation: 0, duration: 0.28, ease: "power2.out" });
        return;
      }
      this.rotateCategory(svg, categories, noteEl, distance < 0 ? 1 : -1);
    });
    board.addEventListener("pointercancel", () => {
      pointerStartX = null;
      board.classList.remove("is-dragging");
      const activeSlide = svg.querySelector<SVGGElement>(".skills__category-slide.is-active");
      if (activeSlide) gsap.to(activeSlide, { x: 0, rotation: 0, duration: 0.28, ease: "power2.out" });
    });
  }

  private rotateCategory(
    svg: SVGSVGElement,
    categories: LaidOutCategory[],
    noteEl: HTMLElement,
    direction: -1 | 1,
  ): void {
    const slides = Array.from(svg.querySelectorAll<SVGGElement>(".skills__category-slide"));
    if (slides.length < 2) return;

    const previousIndex = this.activeCategoryIndex;
    const nextIndex = (previousIndex + direction + slides.length) % slides.length;
    const outgoing = slides[previousIndex];
    const incoming = slides[nextIndex];
    this.activeCategoryIndex = nextIndex;
    noteEl.hidden = true;

    outgoing.classList.remove("is-active");
    outgoing.setAttribute("aria-hidden", "true");
    incoming.classList.add("is-active");
    incoming.setAttribute("aria-hidden", "false");

    const current = this.query<HTMLElement>("[data-skills-current]");
    const count = this.query<HTMLElement>("[data-skills-count]");
    if (current) current.textContent = categories[nextIndex].label;
    if (count) count.textContent = `${nextIndex + 1} / ${categories.length}`;

    gsap.killTweensOf([outgoing, incoming]);
    if (MotionPreferences.reduced) {
      outgoing.style.visibility = "hidden";
      incoming.style.visibility = "visible";
      gsap.set([outgoing, incoming], { x: 0, rotation: 0, scale: 1 });
      return;
    }

    incoming.style.visibility = "visible";
    gsap.to(outgoing, {
      x: -direction * SkillsSection.ROLL_DISTANCE,
      rotation: -direction * SkillsSection.ROLL_ROTATION,
      transformOrigin: "center",
      duration: 0.72,
      ease: "power2.inOut",
      onComplete: () => {
        if (!outgoing.classList.contains("is-active")) outgoing.style.visibility = "hidden";
      },
    });
    gsap.fromTo(
      incoming,
      {
        x: direction * SkillsSection.ROLL_DISTANCE,
        rotation: direction * SkillsSection.ROLL_ROTATION,
        transformOrigin: "center",
      },
      { x: 0, rotation: 0, duration: 0.72, ease: "power2.inOut" },
    );
  }

  private animateEntrance(svg: SVGSVGElement, section: HTMLElement): void {
    if (MotionPreferences.reduced) return;

    const activeSlide = svg.querySelector<SVGGElement>(".skills__category-slide.is-active");
    if (!activeSlide) return;
    const animatable = Array.from(activeSlide.children);
    gsap.set(animatable, { opacity: 0, scale: 0.85, transformOrigin: "center" });
    ScrollTrigger.create({
      trigger: section,
      start: "top 75%",
      once: true,
      onEnter: () =>
        gsap.to(animatable, {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.6)",
          stagger: 0.03,
        }),
    });
  }
}
