/** Static generator for the chalkboard grain texture, cached after first use. */
export class NoiseTexture {
  private static cachedGrainUrl: string | null = null;

  public static grainUrl(size = 180, opacity = 0.09): string {
    if (NoiseTexture.cachedGrainUrl) return NoiseTexture.cachedGrainUrl;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.random() * 255;
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = Math.random() * 255 * opacity;
    }
    ctx.putImageData(imageData, 0, 0);

    NoiseTexture.cachedGrainUrl = canvas.toDataURL("image/png");
    return NoiseTexture.cachedGrainUrl;
  }
}
