import { Matter, PhysicsWorld, VisibilityGate } from "../core/physics";
import { MotionPreferences } from "../core/motion";

/**
 * Turns a sticky-note element into a pin-hinged, draggable physics body.
 *
 * The note is positioned `absolute` against its nearest positioned ancestor
 * (usually the enclosing `<section>`, via `offsetParent`) rather than
 * `fixed` against the viewport — otherwise its pin point would stay glued to
 * the screen while the surrounding content scrolled away underneath it.
 * Every coordinate the physics body works with is local to that ancestor, so
 * the whole rig scrolls with the page for free.
 *
 * Dragging is modeled as a temporary spring constraint (solved alongside the
 * pin) rather than a direct position override — overriding position each
 * frame fights the pin constraint and builds up tension that explodes into
 * a wild spin once released.
 */
export class DraggableStickyNote {
  private readonly note: HTMLElement;
  private readonly enabled: boolean;
  private readonly world: PhysicsWorld;
  private readonly body: Matter.Body | null = null;
  private readonly halfW: number = 0;
  private readonly halfH: number = 0;
  private readonly containingBlock: HTMLElement | null = null;
  private readonly visibilityGate: VisibilityGate | null = null;
  private readonly stopSync: (() => void) | null = null;
  private dragConstraint: Matter.Constraint | null = null;

  constructor(note: HTMLElement, visibilityAnchor: Element) {
    this.note = note;
    this.enabled =
      !MotionPreferences.reduced && window.matchMedia("(min-width: 761px) and (pointer: fine)").matches;
    this.world = new PhysicsWorld({ x: 0, y: 1 });
    if (!this.enabled) return;

    this.containingBlock = (note.offsetParent as HTMLElement | null) ?? document.body;

    const rect = note.getBoundingClientRect();
    const origin = this.toLocalPoint(rect.left, rect.top);
    this.halfW = rect.width / 2;
    this.halfH = rect.height / 2;

    const body = Matter.Bodies.rectangle(
      origin.x + this.halfW,
      origin.y + this.halfH,
      rect.width * 0.94,
      rect.height * 0.9,
      { restitution: 0.35, frictionAir: 0.055, density: 0.0018 },
    );
    Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.05);
    this.world.add(body);
    this.body = body;

    const pinConstraint = Matter.Constraint.create({
      pointA: { x: body.position.x, y: body.position.y - this.halfH + 8 },
      bodyB: body,
      pointB: { x: 0, y: -this.halfH + 8 },
      stiffness: 0.4,
      damping: 0.18,
      length: 2,
    });
    this.world.add(pinConstraint);

    note.style.position = "absolute";
    note.style.left = "0px";
    note.style.top = "0px";
    note.style.margin = "0";
    note.style.zIndex = "20";
    PhysicsWorld.syncElement(body, note, this.halfW, this.halfH);

    this.stopSync = this.world.onTick(() => PhysicsWorld.syncElement(body, note, this.halfW, this.halfH));
    this.visibilityGate = new VisibilityGate(
      visibilityAnchor,
      () => {
        note.style.display = "";
        this.world.start();
      },
      () => {
        this.world.stop();
        note.style.display = "none";
      },
    );
    this.world.start();

    note.addEventListener("pointerdown", this.handlePointerDown);
  }

  /** Converts viewport (client) coordinates into the containing block's local space. */
  private toLocalPoint(clientX: number, clientY: number): { x: number; y: number } {
    const originRect = this.containingBlock?.getBoundingClientRect();
    return {
      x: clientX - (originRect?.left ?? 0),
      y: clientY - (originRect?.top ?? 0),
    };
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.body) return;
    const point = this.toLocalPoint(event.clientX, event.clientY);
    const grabPoint = {
      x: point.x - this.body.position.x,
      y: point.y - this.body.position.y,
    };
    this.dragConstraint = Matter.Constraint.create({
      pointA: point,
      bodyB: this.body,
      pointB: grabPoint,
      stiffness: 0.6,
      damping: 0.3,
      length: 0,
    });
    this.world.add(this.dragConstraint);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragConstraint) return;
    this.dragConstraint.pointA = this.toLocalPoint(event.clientX, event.clientY);
  };

  private readonly handlePointerUp = (): void => {
    if (!this.dragConstraint) return;
    this.world.remove(this.dragConstraint);
    this.dragConstraint = null;
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
  };

  public dispose(): void {
    if (!this.enabled) return;
    this.note.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.stopSync?.();
    this.visibilityGate?.dispose();
    this.world.stop();
  }
}
