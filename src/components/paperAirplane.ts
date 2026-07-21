import { Matter, PhysicsWorld } from "../core/physics";
import { MotionPreferences } from "../core/motion";

/** Flings a cloned plane element off-screen with a light physics toss. */
export class PaperAirplane {
  private readonly element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  public launch(): void {
    if (MotionPreferences.reduced) {
      this.element.style.transition = "opacity 0.4s";
      this.element.style.opacity = "0";
      return;
    }

    const rect = this.element.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const world = new PhysicsWorld({ x: 0.015, y: 0.3 });

    const body = Matter.Bodies.rectangle(rect.left + halfW, rect.top + halfH, rect.width, rect.height, {
      frictionAir: 0.012,
    });
    world.add(body);
    Matter.Body.setVelocity(body, { x: 8.5, y: -13 });
    Matter.Body.setAngularVelocity(body, 0.05);

    this.element.style.position = "fixed";
    this.element.style.left = "0";
    this.element.style.top = "0";
    this.element.style.zIndex = "30";

    world.start();
    const stop = world.onTick(() => {
      PhysicsWorld.syncElement(body, this.element, halfW, halfH);
      const offscreen = body.position.y < -200 || body.position.x > window.innerWidth + 200;
      if (offscreen) {
        stop();
        world.stop();
        this.element.remove();
      }
    });
  }
}
