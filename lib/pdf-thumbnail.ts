async function renderFirstPage(file: File): Promise<Blob | null> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const unscaledViewport = page.getViewport({ scale: 1 });
  const targetWidth = 400;
  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  await page.render({ canvasContext: context, viewport }).promise;

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// Manche PDFs (kaputte xref-Tabelle, unerwartete Struktur) lassen pdf.js
// im Recovery-Modus haengen, ohne je zu resolven oder zu rejecten. Ein
// Timeout stellt sicher, dass der Upload-Flow dadurch nie blockiert.
export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    return await Promise.race([
      renderFirstPage(file),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
  } catch {
    return null;
  }
}
