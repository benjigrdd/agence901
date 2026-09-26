export type ResizedImage = { dataUrl: string; width: number; height: number; mime: string };

/** Redimensionne cote navigateur (2 000 px max) et convertit en WebP via un canvas. */
export async function resizeToWebp(file: File, maxSize = 2000): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Traitement de l’image impossible dans ce navigateur');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.85);
  // Certains navigateurs n'encodent pas le WebP : ils renvoient du PNG.
  const mime = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/png';
  return { dataUrl, width, height, mime };
}
