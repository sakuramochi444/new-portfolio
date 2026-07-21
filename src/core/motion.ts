import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Static gateway to the user's `prefers-reduced-motion` setting. */
export class MotionPreferences {
  private static readonly query = window.matchMedia("(prefers-reduced-motion: reduce)");

  public static get reduced(): boolean {
    return MotionPreferences.query.matches;
  }

  public static onChange(callback: (reduced: boolean) => void): void {
    MotionPreferences.query.addEventListener("change", (event) => callback(event.matches));
  }
}

export { gsap, ScrollTrigger };
