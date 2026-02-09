const PHOTOS_PATH = "/photos";

let cached: Promise<HTMLImageElement[]> | null = null;

export function loadPhotos(): Promise<HTMLImageElement[]> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const res = await fetch(`${PHOTOS_PATH}/manifest.json`);
      const names: string[] = await res.json();
      if (!names?.length) return [];
      const images: HTMLImageElement[] = [];
      for (const name of names) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load ${name}`));
            img.src = `${PHOTOS_PATH}/${name}`;
          });
          images.push(img);
        } catch {
          // skip failed image
        }
      }
      return images;
    } catch {
      return [];
    }
  })();
  return cached;
}
