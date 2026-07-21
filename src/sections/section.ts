/**
 * Base class for every page section. Subclasses render their markup into the
 * given container and wire up their own behaviour in `mount`.
 */
export abstract class Section<TProps> {
  protected readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public abstract mount(props: TProps): void;

  protected setMarkup(html: string): void {
    this.container.innerHTML = html;
  }

  protected query<T extends Element>(selector: string): T | null {
    return this.container.querySelector<T>(selector);
  }

  protected queryAll<T extends Element>(selector: string): NodeListOf<T> {
    return this.container.querySelectorAll<T>(selector);
  }
}
