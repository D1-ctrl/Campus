import JSZip from "jszip";

const THUMBNAIL_PATHS: { path: string; contentType: string }[] = [
  { path: "docProps/thumbnail.jpeg", contentType: "image/jpeg" },
  { path: "docProps/thumbnail.jpg", contentType: "image/jpeg" },
  { path: "docProps/thumbnail.png", contentType: "image/png" },
];

// .docx/.pptx sind ZIP-Pakete (OOXML). PowerPoint/Word legen beim Speichern
// standardmaessig ein Vorschaubild unter docProps/thumbnail.* im Paket ab
// (dieselbe Vorschau, die z.B. der Windows-Explorer anzeigt) - das koennen
// wir direkt extrahieren, ohne die Datei selbst rendern zu muessen.
async function extractEmbeddedThumbnail(file: File): Promise<Blob | null> {
  const zip = await JSZip.loadAsync(file);

  for (const { path, contentType } of THUMBNAIL_PATHS) {
    const entry = zip.file(path);
    if (entry) {
      const data = await entry.async("blob");
      return data.slice(0, data.size, contentType);
    }
  }

  return null;
}

export async function generateOfficeThumbnail(file: File): Promise<Blob | null> {
  try {
    return await Promise.race([
      extractEmbeddedThumbnail(file),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
  } catch {
    return null;
  }
}
