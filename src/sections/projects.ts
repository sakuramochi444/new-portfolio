import type { Project } from "../types";
import { gsap, MotionPreferences } from "../core/motion";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

export class ProjectsSection extends Section<Project[]> {
  private static readonly TILTS = [-1.2, 0.9, -0.6, 1.3, -0.8, 0.7];
  private projects: Project[] = [];
  private modal: HTMLElement | null = null;
  private modalPanel: HTMLElement | null = null;
  private modalContent: HTMLElement | null = null;
  private lastFocusedElement: HTMLElement | null = null;
  private resizeTimer = 0;

  public mount(projects: Project[]): void {
    this.projects = projects;
    const featured = projects.filter((project) => project.tier === "featured");
    const standard = projects.filter((project) => project.tier === "standard");
    const past = projects.filter((project) => project.tier === "past");

    this.setMarkup(`
      <section id="projects" class="section projects" data-accent="magenta" data-section-label="Works">
        <div class="section-inner projects__inner">
          <p class="section-tag" style="--section-accent: var(--accent-magenta)">// selected works</p>
          <h2 class="section-heading"><span class="stroke-underline">つくったもの<svg></svg></span></h2>
          <p class="projects__intro">課題設定から設計・テストまで、自分の判断が伝わる作品を中心に掲載しています。</p>
          <div class="projects__board" data-projects-board>
            <svg class="projects__threads" aria-hidden="true"></svg>
            <div class="projects__group" aria-labelledby="featured-projects-title">
              <div class="projects__group-heading">
                <p class="projects__eyebrow">SELECTED WORKS</p>
                <h3 id="featured-projects-title">代表作</h3>
              </div>
              <div class="projects__grid projects__grid--featured">
                ${featured.map((project, index) => this.renderCard(project, ProjectsSection.TILTS[index])).join("")}
              </div>
            </div>
            <div class="projects__group" aria-labelledby="other-projects-title">
              <div class="projects__group-heading">
                <p class="projects__eyebrow">MORE WORKS</p>
                <h3 id="other-projects-title">そのほかの作品</h3>
              </div>
              <div class="projects__grid projects__grid--standard">
                ${standard.map((project, index) => this.renderCard(project, ProjectsSection.TILTS[(index + 3) % ProjectsSection.TILTS.length])).join("")}
              </div>
            </div>
            ${
              past.length
                ? `<details class="projects__past">
                    <summary>その他の制作 <span>(${past.length})</span></summary>
                    <div class="projects__grid projects__grid--past">
                      ${past.map((project, index) => this.renderCard(project, ProjectsSection.TILTS[index], true)).join("")}
                    </div>
                  </details>`
                : ""
            }
          </div>
        </div>
        <div class="project-modal" data-project-modal role="dialog" aria-modal="true" aria-labelledby="project-modal-title" hidden>
          <div class="project-modal__backdrop" data-modal-close aria-hidden="true"></div>
          <div class="project-modal__panel" tabindex="-1">
            <button type="button" class="project-modal__close" data-modal-close aria-label="作品詳細を閉じる">✕</button>
            <div data-modal-content></div>
          </div>
        </div>
      </section>
    `);

    this.modal = this.query<HTMLElement>("[data-project-modal]");
    this.modalPanel = this.query<HTMLElement>(".project-modal__panel");
    this.modalContent = this.query<HTMLElement>("[data-modal-content]");
    if (this.modal) document.body.appendChild(this.modal);

    const board = this.query<HTMLElement>("[data-projects-board]");
    const threadSvg = this.query<SVGSVGElement>(".projects__threads");
    if (board && threadSvg && !window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => this.drawThreads(board, threadSvg));
      window.addEventListener("resize", this.handleResize);
    }

    this.queryAll<HTMLButtonElement>("[data-open-project]").forEach((button) => {
      button.addEventListener("click", () => this.handleOpenClick(button));
    });
    this.modal?.querySelectorAll<HTMLElement>("[data-modal-close]").forEach((element) => {
      element.addEventListener("click", this.handleCloseClick);
    });
    window.addEventListener("keydown", this.handleKeydown);
    RevealAnimator.reveal(this.queryAll(".project-card"), { stagger: 0.08 });
  }

  public dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeydown);
    this.modal?.remove();
  }

  private readonly handleResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      const board = this.query<HTMLElement>("[data-projects-board]");
      const svg = this.query<SVGSVGElement>(".projects__threads");
      if (board && svg) this.drawThreads(board, svg);
    }, 200);
  };

  private readonly handleOpenClick = (button: HTMLButtonElement): void => {
    const project = this.projects.find((item) => item.id === button.dataset.openProject);
    if (project) this.openModal(project, button);
  };

  private readonly handleCloseClick = (): void => this.closeModal();

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!this.modal || this.modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = this.getFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      this.modalPanel?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private optimizedSources(src: string): { small: string; large: string } {
    const separatorIndex = src.lastIndexOf("/");
    const directory = src.slice(0, separatorIndex);
    const fileName = src.slice(separatorIndex + 1).replace(/\.png$/i, "");
    const base = `${directory}/display/${fileName}`;
    return { small: `${base}-480.webp`, large: `${base}-960.webp` };
  }

  private renderImage(src: string, alt: string, detail = false): string {
    const sources = this.optimizedSources(src);
    const sizes = detail ? "(max-width: 760px) 82vw, 560px" : "(max-width: 760px) 100vw, 520px";
    return `<picture>
      <source type="image/webp" srcset="${sources.small} 480w, ${sources.large} 960w" sizes="${sizes}" />
      <img src="${src}" alt="${alt}" width="960" height="600" loading="lazy" decoding="async" />
    </picture>`;
  }

  private renderCard(project: Project, tilt: number, compact = false): string {
    const photo = project.images[0];
    return `
      <article class="pin-card project-card project-card--${project.tier}${compact ? " project-card--compact" : ""}" data-project-id="${project.id}" style="--tilt:${tilt}deg; --pin-color:var(--accent-${project.accent})">
        <span class="tape" aria-hidden="true"></span>
        ${project.tier === "featured" ? `<span class="project-card__featured">Featured・代表作</span>` : ""}
        ${photo ? `<div class="project-card__photo" style="--photo-tilt:${(-tilt * 0.45).toFixed(2)}deg">${this.renderImage(photo, `${project.title}のスクリーンショット`)}</div>` : ""}
        <div class="project-card__meta"><p class="project-card__period">${project.period}</p>${project.status ? `<span class="project-card__status">${project.status}</span>` : ""}</div>
        <h3 class="project-card__title">${project.title}</h3>
        <p class="project-card__summary">${project.summary}</p>
        <div class="project-card__tags">${project.tags.slice(0, compact ? 3 : 5).map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}</div>
        <button type="button" class="btn-scrawl project-card__open" style="--section-accent:var(--accent-${project.accent})" data-open-project="${project.id}" aria-haspopup="dialog">詳しく見る →</button>
      </article>`;
  }

  private renderGallery(project: Project): string {
    if (!project.images.length) return "";
    return `<section class="project-detail__section project-detail__section--gallery" aria-label="作品画像">
      <div class="project-detail__gallery">${project.images.map((src, index) => `<div class="project-detail__photo">${this.renderImage(src, `${project.title}のスクリーンショット${index + 1}`, true)}</div>`).join("")}</div>
    </section>`;
  }

  private renderDetailSection(title: string, content: string, className = ""): string {
    return `<section class="project-detail__section ${className}"><h4>${title}</h4>${content}</section>`;
  }

  private renderDetail(project: Project): string {
    const links = project.links.length
      ? `<div class="project-detail__links">${project.links.map((link) => `<a class="btn-scrawl" style="--section-accent:var(--accent-${project.accent})" href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.label}を新しいタブで開く">${link.label} <span aria-hidden="true">↗</span></a>`).join("")}</div>`
      : `<p class="project-detail__link-note">${project.linkNote ?? "公開リンクはありません。"}</p>`;

    return `
      ${this.renderGallery(project)}
      <header class="project-detail__header">
        <div class="project-card__meta"><p class="project-card__period">${project.period}</p>${project.status ? `<span class="project-card__status">${project.status}</span>` : ""}</div>
        <h3 class="project-detail__title" id="project-modal-title">${project.title}</h3>
        <p class="project-detail__lead">${project.summary}</p>
      </header>
      <div class="project-detail__body">
        ${this.renderDetailSection("概要", `<p>${project.overview}</p>`)}
        ${this.renderDetailSection("解決したかった課題", `<p>${project.problem}</p>`)}
        ${this.renderDetailSection("自分の担当", `<p>${project.role}</p>`, "project-detail__section--role")}
        ${this.renderDetailSection("設計・実装上の工夫", `<ul>${project.implementation.map((item) => `<li>${item}</li>`).join("")}</ul>`)}
        ${this.renderDetailSection("成果・現在の状態", `<p>${project.outcome}</p>`)}
        ${project.aiUsage ? this.renderDetailSection("生成AIの活用", `<p>${project.aiUsage}</p>`, "project-detail__section--ai") : ""}
        ${this.renderDetailSection("使用技術", `<div class="project-card__tags">${project.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}</div>`)}
        ${this.renderDetailSection("リンク", links)}
      </div>`;
  }

  private getFocusableElements(): HTMLElement[] {
    if (!this.modal) return [];
    return Array.from(this.modal.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("hidden"));
  }

  private openModal(project: Project, opener: HTMLElement): void {
    if (!this.modal || !this.modalContent || !this.modalPanel) return;
    this.lastFocusedElement = opener;
    this.modalContent.innerHTML = this.renderDetail(project);
    this.modal.hidden = false;
    const app = document.getElementById("app");
    app?.setAttribute("inert", "");
    app?.setAttribute("aria-hidden", "true");
    document.body.classList.add("has-open-modal");
    requestAnimationFrame(() => this.modal?.querySelector<HTMLButtonElement>(".project-modal__close")?.focus());
    if (MotionPreferences.reduced) return;
    gsap.fromTo(this.modalPanel, { y: 24, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: "power3.out" });
  }

  private closeModal(): void {
    if (!this.modal || this.modal.hidden) return;
    const finish = (): void => {
      if (!this.modal) return;
      this.modal.hidden = true;
      this.modalContent?.replaceChildren();
      const app = document.getElementById("app");
      app?.removeAttribute("inert");
      app?.removeAttribute("aria-hidden");
      document.body.classList.remove("has-open-modal");
      this.lastFocusedElement?.focus();
    };
    if (MotionPreferences.reduced || !this.modalPanel) finish();
    else gsap.to(this.modalPanel, { y: 16, scale: 0.98, opacity: 0, duration: 0.2, ease: "power2.in", onComplete: finish });
  }

  private drawThreads(board: HTMLElement, svg: SVGSVGElement): void {
    svg.innerHTML = "";
    const boardRect = board.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
    const visibleProjects = this.projects.filter((project) => project.tier !== "past");
    for (let index = 0; index < visibleProjects.length - 1; index += 2) {
      const first = board.querySelector<HTMLElement>(`[data-project-id="${visibleProjects[index].id}"]`);
      const second = board.querySelector<HTMLElement>(`[data-project-id="${visibleProjects[index + 1].id}"]`);
      if (!first || !second) continue;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      const x1 = a.left - boardRect.left + a.width / 2;
      const y1 = a.top - boardRect.top + 6;
      const x2 = b.left - boardRect.left + b.width / 2;
      const y2 = b.top - boardRect.top + 6;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${x1},${y1} Q${(x1 + x2) / 2},${Math.max(y1, y2) + 38} ${x2},${y2}`);
      path.setAttribute("class", "projects__thread-line");
      svg.append(path);
    }
  }
}
