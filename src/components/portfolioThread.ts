interface ThreadPoint {
  x: number;
  y: number;
}

/** Draws one continuous thread behind every portfolio section. */
export class PortfolioThread {
  private static readonly X_RATIOS = [0.14, 0.79, 0.22, 0.9, 0.17, 0.76, 0.11];
  private static readonly MOBILE_X_RATIOS = [0.06, 0.93, 0.12, 0.95, 0.07, 0.91, 0.14];
  private static readonly Y_RATIOS = [0.43, 0.57, 0.36, 0.5, 0.64, 0.4, 0.55];
  private readonly main: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly resizeObserver: ResizeObserver;
  private resizeTimer = 0;
  private lastLayoutSignature = "";

  constructor(main: HTMLElement, svg: SVGSVGElement) {
    this.main = main;
    this.svg = svg;
    this.resizeObserver = new ResizeObserver(this.scheduleDraw);
    this.resizeObserver.observe(main);
    window.addEventListener("resize", this.scheduleDraw);
    window.addEventListener("load", this.scheduleDraw, { once: true });
    requestAnimationFrame(this.draw);
  }

  private readonly scheduleDraw = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.draw, 160);
  };

  private buildPath(points: ThreadPoint[]): string {
    if (points.length < 2) return "";

    let d = `M${points[0].x},${points[0].y}`;
    for (let index = 0; index < points.length - 1; index++) {
      const before = points[Math.max(0, index - 1)];
      const start = points[index];
      const end = points[index + 1];
      const after = points[Math.min(points.length - 1, index + 2)];
      const tension = 0.16;
      const controlA = {
        x: start.x + (end.x - before.x) * tension,
        y: start.y + (end.y - before.y) * tension,
      };
      const controlB = {
        x: end.x - (after.x - start.x) * tension,
        y: end.y - (after.y - start.y) * tension,
      };
      d += ` C${controlA.x},${controlA.y} ${controlB.x},${controlB.y} ${end.x},${end.y}`;
    }
    return d;
  }

  private createPath(d: string, className: string): SVGPathElement {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", className);
    return path;
  }

  private readonly draw = (): void => {
    const mainRect = this.main.getBoundingClientRect();
    const width = this.main.clientWidth;
    const height = this.main.scrollHeight;
    if (width <= 0 || height <= 0) return;

    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const sections = Array.from(this.main.querySelectorAll<HTMLElement>(".section"));
    const points: ThreadPoint[] = [{ x: width / 2, y: 0 }];

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const xRatios = isMobile ? PortfolioThread.MOBILE_X_RATIOS : PortfolioThread.X_RATIOS;
      points.push({
        x: width * xRatios[index % xRatios.length],
        y:
          rect.top -
          mainRect.top +
          rect.height * PortfolioThread.Y_RATIOS[index % PortfolioThread.Y_RATIOS.length],
      });
    });
    points.push({ x: width / 2, y: height });

    const layoutSignature = `${Math.round(width)}:${Math.round(height)}:${points
      .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
      .join(";")}`;
    if (layoutSignature === this.lastLayoutSignature) return;
    this.lastLayoutSignature = layoutSignature;

    this.svg.innerHTML = "";
    this.svg.setAttribute("width", `${width}`);
    this.svg.setAttribute("height", `${height}`);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svg.setAttribute("preserveAspectRatio", "none");

    const d = this.buildPath(points);
    const shadow = this.createPath(d, "portfolio-thread__shadow");
    const thread = this.createPath(d, "portfolio-thread__strand");
    const fiber = this.createPath(d, "portfolio-thread__fiber");
    this.svg.append(shadow, thread, fiber);
  };

  public dispose(): void {
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener("resize", this.scheduleDraw);
    window.removeEventListener("load", this.scheduleDraw);
    this.resizeObserver.disconnect();
  }
}
