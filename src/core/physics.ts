import Matter from "matter-js";
import { gsap } from "./motion";

/** Encapsulates a Matter.js engine and drives it from the shared GSAP ticker. */
export class PhysicsWorld {
  private readonly engine: Matter.Engine;
  private readonly tickCallbacks = new Set<(deltaMs: number) => void>();
  private running = false;

  private readonly tick = (_time: number, deltaMs: number): void => {
    const step = Math.min(deltaMs, 33.4);
    Matter.Engine.update(this.engine, step);
    this.tickCallbacks.forEach((callback) => callback(step));
  };

  constructor(gravity: { x: number; y: number } = { x: 0, y: 0.55 }) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.x = gravity.x;
    this.engine.gravity.y = gravity.y;
  }

  public add(item: Matter.Body | Matter.Constraint): void {
    Matter.World.add(this.engine.world, item);
  }

  public remove(item: Matter.Body | Matter.Constraint): void {
    Matter.World.remove(this.engine.world, item);
  }

  public onTick(callback: (deltaMs: number) => void): () => void {
    this.tickCallbacks.add(callback);
    return () => this.tickCallbacks.delete(callback);
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    gsap.ticker.add(this.tick);
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    gsap.ticker.remove(this.tick);
  }

  public get isRunning(): boolean {
    return this.running;
  }

  /** Writes a physics body's position/angle onto a DOM element as a CSS transform. */
  public static syncElement(body: Matter.Body, el: HTMLElement, halfWidth: number, halfHeight: number): void {
    el.style.transform =
      `translate(${body.position.x - halfWidth}px, ${body.position.y - halfHeight}px) ` +
      `rotate(${body.angle}rad)`;
  }
}

/** Wraps an IntersectionObserver as a disposable gate between "visible" and "not visible". */
export class VisibilityGate {
  private readonly observer: IntersectionObserver;

  constructor(target: Element, onEnter: () => void, onExit: () => void, threshold = 0.12) {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onEnter();
          else onExit();
        }
      },
      { threshold },
    );
    this.observer.observe(target);
  }

  public dispose(): void {
    this.observer.disconnect();
  }
}

export { Matter };
