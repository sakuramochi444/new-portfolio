import { gsap, MotionPreferences, ScrollTrigger } from "../core/motion";
import { RoughTheme } from "../core/rough";

interface ThreadPoint {
  x: number;
  y: number;
}

/** Draws one continuous thread behind every portfolio section. */
export class PortfolioThread {
  private readonly main: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly resizeObserver: ResizeObserver;
  private resizeTimer = 0;

  constructor(main: HTMLElement, svg: SVGSVGElement) {
    this.main = main;
    this.svg = svg;
    this.resizeObserver = new ResizeObserver(this.scheduleDraw);
    this.resizeObserver.observe(main);
    main.querySelectorAll<HTMLElement>(".section").forEach((section) => this.resizeObserver.observe(section));
    window.addEventListener("resize", this.scheduleDraw);
    window.addEventListener("load", this.scheduleDraw, { once: true });
    requestAnimationFrame(this.draw);
  }

  private readonly scheduleDraw = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.draw, 160);
  };

  private buildPath(points: ThreadPoint[]): string {
    if (points.length === 0) return "";

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const handle = Math.min(Math.abs(current.y - previous.y) * 0.42, 280);
      d += ` C${previous.x},${previous.y + handle} ${current.x},${current.y - handle} ${current.x},${current.y}`;
    }
    return d;
  }

  private readonly draw = (): void => {
    const mainRect = this.main.getBoundingClientRect();
    const width = this.main.clientWidth;
    const height = this.main.scrollHeight;
    if (width <= 0 || height <= 0) return;

    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const edgeInset = isMobile ? 10 : Math.max(30, width * 0.055);
    const sections = Array.from(this.main.querySelectorAll<HTMLElement>(".section"));
    const points: ThreadPoint[] = [{ x: width / 2, y: 0 }];

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      points.push({
        x: index % 2 === 0 ? edgeInset : width - edgeInset,
        y: rect.top - mainRect.top + rect.height * 0.5,
      });
    });
    points.push({ x: width / 2, y: height });

    this.svg.innerHTML = "";
    this.svg.setAttribute("width", `${width}`);
    this.svg.setAttribute("height", `${height}`);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svg.setAttribute("preserveAspectRatio", "none");

    const d = this.buildPath(points);
    const roughSvg = RoughTheme.createSvg(this.svg);
    const shadow = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#4e2029", strokeWidth: 5.5, roughness: 1.2, bowing: 0.45 }),
    );
    const thread = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#ff5252", strokeWidth: 2.8, roughness: 1.45, bowing: 0.65 }),
    );
    const fiber = roughSvg.path(
      d,
      RoughTheme.options({ stroke: "#ffb0b0", strokeWidth: 0.8, roughness: 1.7, bowing: 0.8 }),
    );
    fiber.setAttribute("transform", "translate(1 0)");
    this.svg.append(shadow, thread, fiber);

    const paths = Array.from(this.svg.querySelectorAll<SVGPathElement>("path"));
    paths.forEach((path) => {
      path.style.strokeLinecap = "round";
    });

    ScrollTrigger.getById("portfolio-thread")?.kill();
    if (MotionPreferences.reduced) return;

    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
    });

    gsap.to(paths, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        id: "portfolio-thread",
        trigger: this.main,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
    ScrollTrigger.refresh();
  };

  public dispose(): void {
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener("resize", this.scheduleDraw);
    window.removeEventListener("load", this.scheduleDraw);
    this.resizeObserver.disconnect();
    ScrollTrigger.getById("portfolio-thread")?.kill();
  }
}
