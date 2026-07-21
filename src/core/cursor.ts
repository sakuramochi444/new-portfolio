import { gsap, MotionPreferences } from "./motion";
import { RoughTheme } from "./rough";
import type { AccentColor } from "../types";

const DEFAULT_ACCENT: AccentColor = "cyan";

/** Replaces the system pointer with a marker-tip cursor that trails and re-tints per section. */
export class CustomCursor {
  private readonly tip: HTMLElement;
  private readonly glow: HTMLElement;
  private readonly pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private readonly trailing = { x: this.pointer.x, y: this.pointer.y };
  private readonly enabled: boolean;

  constructor() {
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    this.enabled = !isCoarsePointer && !MotionPreferences.reduced;

    this.tip = document.createElement("div");
    this.tip.className = "cursor-tip";
    this.glow = document.createElement("div");
    this.glow.className = "cursor-glow";

    if (!this.enabled) return;

    document.body.append(this.glow, this.tip);
    document.body.classList.add("has-custom-cursor");
    document.documentElement.style.setProperty("--cursor-accent", RoughTheme.ACCENT_COLORS[DEFAULT_ACCENT]);

    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerleave", this.handlePointerLeave);
    window.addEventListener("pointerenter", this.handlePointerEnter);
    gsap.ticker.add(this.handleTick);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.tip.style.transform = `translate(${this.pointer.x}px, ${this.pointer.y}px)`;

    const target = event.target as Element | null;
    const accentEl = target?.closest<HTMLElement>("[data-accent]");
    const accent = (accentEl?.dataset.accent as AccentColor | undefined) ?? DEFAULT_ACCENT;
    document.documentElement.style.setProperty("--cursor-accent", RoughTheme.ACCENT_COLORS[accent]);

    const isInteractive = target?.closest("a, button, [data-cursor-hover]");
    document.body.classList.toggle("cursor-hover", Boolean(isInteractive));
  };

  private readonly handlePointerLeave = (): void => {
    this.tip.style.opacity = "0";
    this.glow.style.opacity = "0";
  };

  private readonly handlePointerEnter = (): void => {
    this.tip.style.opacity = "1";
    this.glow.style.opacity = "1";
  };

  private readonly handleTick = (): void => {
    this.trailing.x += (this.pointer.x - this.trailing.x) * 0.16;
    this.trailing.y += (this.pointer.y - this.trailing.y) * 0.16;
    this.glow.style.transform = `translate(${this.trailing.x}px, ${this.trailing.y}px)`;
  };

  public dispose(): void {
    if (!this.enabled) return;
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerleave", this.handlePointerLeave);
    window.removeEventListener("pointerenter", this.handlePointerEnter);
    gsap.ticker.remove(this.handleTick);
    this.tip.remove();
    this.glow.remove();
    document.body.classList.remove("has-custom-cursor");
  }
}
