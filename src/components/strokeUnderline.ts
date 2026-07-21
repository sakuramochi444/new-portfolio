import { gsap, MotionPreferences } from "../core/motion";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Draws a hand-scrawled underline beneath a heading span when it scrolls into view. */
export class StrokeUnderline {
  private static readonly SQUIGGLE_D =
    "M2,10 C 20,0 30,20 48,10 C 66,0 76,20 94,10 C 112,0 122,20 140,10 " +
    "C 158,0 168,20 186,10 C 204,0 214,20 232,10 C 250,0 260,20 278,10 " +
    "C 296,0 306,20 324,10 C 342,0 352,20 370,10 C 388,0 398,20 416,10";

  constructor(wrapper: HTMLElement, color: string) {
    this.mount(wrapper, color);
  }

  private mount(wrapper: HTMLElement, color: string): void {
    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("viewBox", "0 0 420 20");
    svg.setAttribute("preserveAspectRatio", "none");

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", StrokeUnderline.SQUIGGLE_D);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "5");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;

    if (MotionPreferences.reduced) {
      path.style.strokeDashoffset = "0";
      return;
    }

    path.style.strokeDashoffset = `${length}`;
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: "power2.out",
      scrollTrigger: {
        trigger: wrapper,
        start: "top 85%",
      },
    });
  }

  public static mountAll(root: ParentNode, color: string): void {
    root.querySelectorAll<HTMLElement>(".stroke-underline").forEach((el) => new StrokeUnderline(el, color));
  }
}
