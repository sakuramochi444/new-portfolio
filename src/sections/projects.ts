import type { Project } from "../types";
import { gsap, MotionPreferences, ScrollTrigger } from "../core/motion";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

export class ProjectsSection extends Section<Project[]> {
  private static readonly TILTS = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9];

  private projects: Project[] = [];
  private threadShapes = new Map<string, { sagMultiplier: number; bend: number }>();
  private readonly revealedProjectIds = new Set<string>();
  private readonly threadRevealTriggers: Array<ReturnType<typeof ScrollTrigger.create>> = [];
  private resizeTimer = 0;

  public mount(projects: Project[]): void {
    this.projects = projects;
    this.threadShapes.clear();

    this.setMarkup(`
      <section id="projects" class="section projects" data-accent="magenta" data-section-label="Works">
        <div class="section-inner projects__inner">
          <p class="section-tag" style="--section-accent: var(--accent-magenta)">// git log --oneline</p>
          <h2 class="section-heading"><span class="stroke-underline">つくったもの<svg></svg></span></h2>
          <p class="skills__hint">赤い糸は、技術がつながっているプロジェクト同士の印。</p>
          <div class="projects__board" data-projects-board>
            <svg class="projects__threads" aria-hidden="true"></svg>
            <div class="projects__grid">
              ${projects.map((project, index) => this.renderCard(project, ProjectsSection.TILTS[index % ProjectsSection.TILTS.length])).join("")}
            </div>
          </div>
        </div>
        <div class="project-modal" data-project-modal hidden>
          <div class="project-modal__backdrop" data-modal-close></div>
          <div class="project-modal__panel">
            <button type="button" class="project-modal__close" data-modal-close aria-label="閉じる">✕</button>
            <div data-modal-content></div>
          </div>
        </div>
      </section>
    `);

    const board = this.query<HTMLElement>("[data-projects-board]");
    const threadSvg = this.query<SVGSVGElement>(".projects__threads");
    const showConnections = !window.matchMedia("(max-width: 760px)").matches;
    if (board && threadSvg && showConnections) {
      requestAnimationFrame(() => this.drawThreads(board, threadSvg));
      window.addEventListener("resize", this.handleResize);
    }

    this.queryAll<HTMLElement>("[data-open-project]").forEach((button) => {
      button.addEventListener("click", () => this.handleOpenClick(button));
    });

    this.queryAll<HTMLElement>("[data-modal-close]").forEach((el) => {
      el.addEventListener("click", this.handleCloseClick);
    });

    window.addEventListener("keydown", this.handleKeydown);

    RevealAnimator.reveal(this.queryAll(".project-card"), { stagger: 0.1 });
    if (threadSvg && showConnections) this.initThreadReveal(threadSvg);
  }

  public dispose(): void {
    this.threadRevealTriggers.forEach((trigger) => trigger.kill());
    this.threadRevealTriggers.length = 0;
    const threadSvg = this.query<SVGSVGElement>(".projects__threads");
    if (threadSvg) gsap.killTweensOf(threadSvg.querySelectorAll("path"));
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeydown);
  }

  private initThreadReveal(threadSvg: SVGSVGElement): void {
    this.queryAll<HTMLElement>(".project-card").forEach((card) => {
      const projectId = card.dataset.projectId;
      if (!projectId) return;

      const reveal = (): void => {
        this.revealedProjectIds.add(projectId);
        this.revealEligibleThreads(threadSvg, MotionPreferences.reduced ? 0 : 0.85);
      };

      if (MotionPreferences.reduced) {
        reveal();
        return;
      }

      this.threadRevealTriggers.push(
        ScrollTrigger.create({
          trigger: card,
          start: "top 88%",
          once: true,
          onEnter: reveal,
        }),
      );
    });
  }

  private revealEligibleThreads(threadSvg: SVGSVGElement, delay: number): void {
    const keys = new Set(
      Array.from(threadSvg.querySelectorAll<SVGPathElement>("[data-thread-key]"))
        .filter((path) => {
          const projectA = path.dataset.projectA;
          const projectB = path.dataset.projectB;
          return Boolean(
            projectA &&
              projectB &&
              this.revealedProjectIds.has(projectA) &&
              this.revealedProjectIds.has(projectB),
          );
        })
        .map((path) => path.dataset.threadKey)
        .filter((key): key is string => Boolean(key)),
    );

    keys.forEach((key) => {
      const paths = threadSvg.querySelectorAll<SVGPathElement>(`[data-thread-key="${key}"]`);
      gsap.to(paths, { opacity: 1, duration: 0.5, delay, ease: "power2.out", overwrite: "auto" });
    });
  }

  private readonly handleResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      const board = this.query<HTMLElement>("[data-projects-board]");
      const threadSvg = this.query<SVGSVGElement>(".projects__threads");
      if (board && threadSvg) this.drawThreads(board, threadSvg);
    }, 200);
  };

  private readonly handleOpenClick = (button: HTMLElement): void => {
    const id = button.dataset.openProject;
    const project = this.projects.find((p) => p.id === id);
    const card = button.closest<HTMLElement>(".project-card");
    if (project && card) this.openModal(project, card);
  };

  private readonly handleCloseClick = (): void => this.closeModal();

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const modal = this.query<HTMLElement>("[data-project-modal]");
    if (event.key === "Escape" && modal && !modal.hidden) this.closeModal();
  };

  private renderCard(project: Project, tilt: number): string {
    const photo = project.images[0];
    return `
      <article
        class="pin-card project-card"
        data-project-id="${project.id}"
        style="--tilt:${tilt}deg; --pin-color:var(--accent-${project.accent})"
      >
        <span class="tape" aria-hidden="true"></span>
        ${
          photo
            ? `<div class="project-card__photo" style="--photo-tilt:${(-tilt * 0.6).toFixed(2)}deg">
                <img src="${photo}" alt="${project.title}のスクリーンショット" loading="lazy" decoding="async" />
              </div>`
            : ""
        }
        <p class="project-card__period">${project.period}</p>
        <h3 class="project-card__title">${project.title}</h3>
        <p class="project-card__summary">${project.summary}</p>
        <div class="project-card__tags">
          ${project.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}
        </div>
        <button
          type="button"
          class="btn-scrawl project-card__open"
          style="--section-accent: var(--accent-${project.accent})"
          data-open-project="${project.id}"
        >
          詳しく見る →
        </button>
      </article>
    `;
  }

  private renderGallery(project: Project): string {
    if (project.images.length === 0) return "";
    return `
      <div class="project-detail__gallery">
        ${project.images
          .map(
            (src, index) =>
              `<img class="project-detail__photo" src="${src}" alt="${project.title}のスクリーンショット${index + 1}" loading="lazy" decoding="async" />`,
          )
          .join("")}
      </div>
    `;
  }

  private renderDetail(project: Project): string {
    return `
      ${this.renderGallery(project)}
      <p class="project-card__period">${project.period} ・ ${project.role}</p>
      <h3 class="project-detail__title">${project.title}</h3>
      <p class="project-detail__description">${project.description}</p>
      <div class="project-card__tags">
        ${project.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}
      </div>
      <div class="project-detail__links">
        ${project.links
          .map(
            (link) =>
              `<a class="btn-scrawl" style="--section-accent: var(--accent-${project.accent})" href="${link.url}" target="_blank" rel="noreferrer">${link.label} ↗</a>`,
          )
          .join("")}
      </div>
    `;
  }

  private findSharedConnections(): [Project, Project][] {
    const candidates: Array<{ a: Project; b: Project; sharedCount: number; distance: number }> = [];
    for (let i = 0; i < this.projects.length; i++) {
      for (let j = i + 1; j < this.projects.length; j++) {
        const sharedCount = this.projects[i].skillIds.filter((id) => this.projects[j].skillIds.includes(id)).length;
        if (sharedCount > 0) candidates.push({ a: this.projects[i], b: this.projects[j], sharedCount, distance: j - i });
      }
    }

    candidates.sort((left, right) => right.sharedCount - left.sharedCount || left.distance - right.distance);

    const parent = new Map(this.projects.map((project) => [project.id, project.id]));
    const findRoot = (id: string): string => {
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root) ?? root;
      return root;
    };

    const connections: [Project, Project][] = [];
    candidates.forEach(({ a, b }) => {
      const rootA = findRoot(a.id);
      const rootB = findRoot(b.id);
      if (rootA === rootB) return;
      parent.set(rootB, rootA);
      connections.push([a, b]);
    });
    return connections;
  }

  private drawThreads(board: HTMLElement, threadSvg: SVGSVGElement): void {
    threadSvg.innerHTML = "";
    const boardRect = board.getBoundingClientRect();
    threadSvg.setAttribute("width", `${boardRect.width}`);
    threadSvg.setAttribute("height", `${boardRect.height}`);
    threadSvg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);

    const pins = new Map<string, { x: number; y: number }>();
    this.projects.forEach((project) => {
      const card = board.querySelector<HTMLElement>(`[data-project-id="${project.id}"]`);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      pins.set(project.id, {
        x: rect.left - boardRect.left + rect.width / 2,
        y: rect.top - boardRect.top + 4,
      });
    });

    this.findSharedConnections().forEach(([a, b]) => {
      const pinA = pins.get(a.id);
      const pinB = pins.get(b.id);
      if (!pinA || !pinB) return;

      const shapeKey = `${a.id}:${b.id}`;
      let shape = this.threadShapes.get(shapeKey);
      if (!shape) {
        const seed = Array.from(shapeKey).reduce((sum, character) => sum + character.charCodeAt(0), 0);
        shape = {
          sagMultiplier: 0.72 + (seed % 7) * 0.075,
          bend: ((seed % 9) - 4) * 0.018,
        };
        this.threadShapes.set(shapeKey, shape);
      }

      const horizontalDistance = Math.abs(pinA.x - pinB.x);
      const midX = (pinA.x + pinB.x) / 2 + horizontalDistance * shape.bend;
      const baseSag = Math.min(70, horizontalDistance * 0.18) + 24;
      const sag = baseSag * shape.sagMultiplier;
      const d = `M${pinA.x},${pinA.y} Q${midX},${Math.max(pinA.y, pinB.y) + sag} ${pinB.x},${pinB.y}`;
      const shadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const thread = document.createElementNS("http://www.w3.org/2000/svg", "path");
      shadow.setAttribute("d", d);
      shadow.setAttribute("class", "projects__thread-shadow");
      thread.setAttribute("d", d);
      thread.setAttribute("class", "projects__thread-line");
      [shadow, thread].forEach((path) => {
        path.dataset.threadKey = shapeKey;
        path.dataset.projectA = a.id;
        path.dataset.projectB = b.id;
        path.style.opacity =
          this.revealedProjectIds.has(a.id) && this.revealedProjectIds.has(b.id) ? "1" : "0";
      });
      threadSvg.append(shadow, thread);
    });
  }

  private openModal(project: Project, originEl: HTMLElement): void {
    const modal = this.query<HTMLElement>("[data-project-modal]");
    const modalContent = this.query<HTMLElement>("[data-modal-content]");
    const modalPanel = this.query<HTMLElement>(".project-modal__panel");
    const modalBackdrop = this.query<HTMLElement>(".project-modal__backdrop");
    if (!modal || !modalContent || !modalPanel) return;

    modalContent.innerHTML = this.renderDetail(project);
    modal.hidden = false;

    if (MotionPreferences.reduced) return;

    const originRect = originEl.getBoundingClientRect();
    const panelRect = modalPanel.getBoundingClientRect();
    const scaleX = originRect.width / panelRect.width;
    const scaleY = originRect.height / panelRect.height;
    const originX = originRect.left + originRect.width / 2 - (panelRect.left + panelRect.width / 2);
    const originY = originRect.top + originRect.height / 2 - (panelRect.top + panelRect.height / 2);

    gsap.fromTo(
      modalPanel,
      { x: originX, y: originY, scaleX, scaleY, opacity: 0.4, transformOrigin: "center" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.5, ease: "power3.out" },
    );
    if (modalBackdrop) gsap.fromTo(modalBackdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  private closeModal(): void {
    const modal = this.query<HTMLElement>("[data-project-modal]");
    const modalPanel = this.query<HTMLElement>(".project-modal__panel");
    const modalBackdrop = this.query<HTMLElement>(".project-modal__backdrop");
    if (!modal) return;

    if (MotionPreferences.reduced || !modalPanel) {
      modal.hidden = true;
      return;
    }
    gsap.to(modalPanel, {
      opacity: 0,
      scale: 0.92,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        modal.hidden = true;
      },
    });
    if (modalBackdrop) gsap.to(modalBackdrop, { opacity: 0, duration: 0.25 });
  }
}
