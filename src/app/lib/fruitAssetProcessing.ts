const fruitCanvasCache = new Map<string, Promise<HTMLCanvasElement>>();
const fruitUrlCache = new Map<string, Promise<string>>();

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không thể tải asset quả: ${src}`));
    image.src = src;
  });
}

function isCheckerPixel(data: Uint8ClampedArray, pixelIndex: number) {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);

  return darkest >= 224 && brightest - darkest <= 14;
}

function removeConnectedCheckerboard(imageData: ImageData) {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex] || !isCheckerPixel(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[queueEnd++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    data[pixelIndex * 4 + 3] = 0;

    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y < height - 1) enqueue(pixelIndex + width);
  }
}

function cropTransparentCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;

  const { width, height } = canvas;
  const data = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return canvas;

  const padding = 8;
  const sourceX = Math.max(0, minX - padding);
  const sourceY = Math.max(0, minY - padding);
  const sourceWidth = Math.min(width - sourceX, maxX - sourceX + padding + 1);
  const sourceHeight = Math.min(height - sourceY, maxY - sourceY + padding + 1);
  const cropped = document.createElement("canvas");
  cropped.width = sourceWidth;
  cropped.height = sourceHeight;
  cropped.getContext("2d")?.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );
  return cropped;
}

export function getProcessedFruitCanvas(src: string) {
  const cached = fruitCanvasCache.get(src);
  if (cached) return cached;

  const pending = loadImage(src).then((image) => {
    const maxDimension = 560;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý canvas 2D");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    removeConnectedCheckerboard(imageData);
    context.putImageData(imageData, 0, 0);
    return cropTransparentCanvas(canvas);
  });

  fruitCanvasCache.set(src, pending);
  return pending;
}

export function getProcessedFruitUrl(src: string) {
  const cached = fruitUrlCache.get(src);
  if (cached) return cached;

  const pending = getProcessedFruitCanvas(src).then((canvas) => canvas.toDataURL("image/png"));
  fruitUrlCache.set(src, pending);
  return pending;
}
