import { gsap, ScrollTrigger, MotionPreferences } from "./motion";

export interface RevealOptions {
  y?: number;
  stagger?: number;
  start?: string;
}

/** Static helper that fades/slides a batch of elements in as they enter the viewport. */
export class RevealAnimator {
  public static reveal(elements: Element[] | NodeListOf<Element>, options: RevealOptions = {}): void {
    const list = Array.from(elements);
    if (list.length === 0) return;

    if (MotionPreferences.reduced) {
      gsap.set(list, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(list, { opacity: 0, y: options.y ?? 28 });
    ScrollTrigger.batch(list, {
      start: options.start ?? "top 88%",
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: options.stagger ?? 0.08,
        }),
    });
  }
}
