import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import type { RoughSVG } from "roughjs/bin/svg";
import type { AccentColor } from "../types";

/** Static theme for every hand-drawn rough.js shape on the board. */
export class RoughTheme {
  public static readonly ACCENT_COLORS: Record<AccentColor, string> = {
    cyan: "#59f2c8",
    magenta: "#ff6fb0",
    yellow: "#ffd94a",
  };

  private static readonly DEFAULT_OPTIONS: Options = {
    roughness: 1.8,
    bowing: 1.3,
    strokeWidth: 2,
    fillStyle: "hachure",
    hachureGap: 4,
  };

  public static createSvg(svg: SVGSVGElement): RoughSVG {
    return rough.svg(svg, { options: RoughTheme.DEFAULT_OPTIONS });
  }

  public static accentColor(accent: AccentColor): string {
    return RoughTheme.ACCENT_COLORS[accent];
  }

  public static options(overrides: Options = {}): Options {
    return { ...RoughTheme.DEFAULT_OPTIONS, ...overrides };
  }
}
