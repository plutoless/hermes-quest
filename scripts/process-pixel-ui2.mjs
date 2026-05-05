import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('src/assets/pixel-ui2');
const transparentDir = path.join(root, 'transparent');
const slicesDir = path.join(root, 'slices');
const key = [255, 0, 255];
const hardThreshold = 76;
const softThreshold = 145;
const slicePadding = 2;

const files = [
  '6c2a8a89-9ee9-4a85-a993-0d6df3e0741c.png',
  '4994b3f3-1640-4ed1-91e7-11bd43e4d06a.png',
  '22bf844f-bbfd-4913-a940-4f654a34fb3d.png',
  '61eaae55-91a6-4bd3-9590-3dc7f8b7e44e.png',
];

const groupingGapByFile = new Map([
  ['61eaae55-91a6-4bd3-9590-3dc7f8b7e44e.png', 92],
  ['4994b3f3-1640-4ed1-91e7-11bd43e4d06a.png', 18],
  ['22bf844f-bbfd-4913-a940-4f654a34fb3d.png', 16],
  ['6c2a8a89-9ee9-4a85-a993-0d6df3e0741c.png', 12],
]);

await mkdir(transparentDir, { recursive: true });
await mkdir(slicesDir, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  keyColor: '#FF00FF',
  transparentDir: path.relative(root, transparentDir),
  slicesDir: path.relative(root, slicesDir),
  sheets: [],
};

for (const file of files) {
  const sourcePath = path.join(root, file);
  const stem = path.basename(file, '.png');
  const image = sharp(sourcePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const processed = Buffer.from(data);
  const alphaMask = new Uint8Array(info.width * info.height);

  for (let i = 0, pixel = 0; i < processed.length; i += 4, pixel += 1) {
    const r = processed[i];
    const g = processed[i + 1];
    const b = processed[i + 2];
    const dist = colorDistance(r, g, b, key);

    if (dist <= hardThreshold) {
      processed[i] = 0;
      processed[i + 1] = 0;
      processed[i + 2] = 0;
      processed[i + 3] = 0;
      alphaMask[pixel] = 0;
      continue;
    }

    if (dist < softThreshold && looksLikeMagentaSpill(r, g, b)) {
      const alpha = clamp(dist / softThreshold, 0, 1);
      processed[i] = unblend(r, key[0], alpha);
      processed[i + 1] = unblend(g, key[1], alpha);
      processed[i + 2] = unblend(b, key[2], alpha);
      processed[i + 3] = Math.round(alpha * 255);
      alphaMask[pixel] = processed[i + 3];
      continue;
    }

    processed[i + 3] = 255;
    alphaMask[pixel] = 255;
  }

  removeGuideLines(data, processed, alphaMask, info);

  const transparentPath = path.join(transparentDir, `${stem}.png`);
  await sharp(processed, { raw: info }).png({ compressionLevel: 9 }).toFile(transparentPath);

  const rawComponents = componentsFromAlpha(alphaMask, info.width, info.height);
  const components = rawComponents
    .filter((component) => keepComponent(component, info.width, info.height))
    .map((component) => ({ ...component }));
  const merged = mergeNearbyComponents(components, groupingGapByFile.get(file) ?? 16)
    .map((component) => paddedBox(component, info.width, info.height, slicePadding))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const sheetSliceDir = path.join(slicesDir, stem);
  await rm(sheetSliceDir, { recursive: true, force: true });
  await mkdir(sheetSliceDir, { recursive: true });
  const slices = [];
  for (const [index, box] of merged.entries()) {
    const sliceName = `${stem}-${String(index + 1).padStart(3, '0')}.png`;
    const slicePath = path.join(sheetSliceDir, sliceName);
    await sharp(processed, { raw: info })
      .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
      .png({ compressionLevel: 9 })
      .toFile(slicePath);
    slices.push({
      file: path.relative(root, slicePath),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
  }

  manifest.sheets.push({
    source: file,
    transparent: path.relative(root, transparentPath),
    width: info.width,
    height: info.height,
    slices,
  });
  console.log(`${file}: ${slices.length} slices`);
}

await writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

function colorDistance(r, g, b, [kr, kg, kb]) {
  return Math.hypot(r - kr, g - kg, b - kb);
}

function looksLikeMagentaSpill(r, g, b) {
  return r > 150 && b > 150 && g < 150;
}

function unblend(channel, keyChannel, alpha) {
  if (alpha <= 0.001) return 0;
  return Math.round(clamp((channel - (1 - alpha) * keyChannel) / alpha, 0, 255));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function componentsFromAlpha(alphaMask, width, height) {
  const visited = new Uint8Array(alphaMask.length);
  const components = [];
  const stack = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index] || alphaMask[index] <= 8) continue;
      visited[index] = 1;
      stack.push(index);
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      while (stack.length > 0) {
        const current = stack.pop();
        const cx = current % width;
        const cy = Math.floor(current / width);
        area += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbor = ny * width + nx;
            if (visited[neighbor] || alphaMask[neighbor] <= 8) continue;
            visited[neighbor] = 1;
            stack.push(neighbor);
          }
        }
      }
      components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
    }
  }
  return components;
}

function keepComponent(component, sheetWidth, sheetHeight) {
  if (component.area < 28) return false;
  if (component.width <= 4 || component.height <= 4) return false;
  const density = component.area / (component.width * component.height);
  const isLongSeparator = density < 0.09 && (component.width > sheetWidth * 0.32 || component.height > sheetHeight * 0.32);
  if (isLongSeparator) return false;
  const isSheetBorder = component.width > sheetWidth * 0.9 || component.height > sheetHeight * 0.9;
  if (isSheetBorder && density < 0.12) return false;
  const isTinyLabel = component.area < 140 && component.width < 18 && component.height < 18;
  if (isTinyLabel) return false;
  return true;
}

function removeGuideLines(original, processed, alphaMask, info) {
  const guide = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = y * info.width + x;
      const sourceIndex = index * 4;
      if (looksLikeLightMagentaGuide(original[sourceIndex], original[sourceIndex + 1], original[sourceIndex + 2])) {
        guide[index] = 1;
      }
    }
  }
  for (let y = 0; y < info.height; y += 1) {
    let runStart = -1;
    for (let x = 0; x <= info.width; x += 1) {
      const isGuide = x < info.width && guide[y * info.width + x];
      if (isGuide && runStart === -1) runStart = x;
      if ((!isGuide || x === info.width) && runStart !== -1) {
        if (x - runStart >= 96) {
          for (let rx = runStart; rx < x; rx += 1) clearPixel(processed, alphaMask, y * info.width + rx);
        }
        runStart = -1;
      }
    }
  }
  for (let x = 0; x < info.width; x += 1) {
    let runStart = -1;
    for (let y = 0; y <= info.height; y += 1) {
      const isGuide = y < info.height && guide[y * info.width + x];
      if (isGuide && runStart === -1) runStart = y;
      if ((!isGuide || y === info.height) && runStart !== -1) {
        if (y - runStart >= 96) {
          for (let ry = runStart; ry < y; ry += 1) clearPixel(processed, alphaMask, ry * info.width + x);
        }
        runStart = -1;
      }
    }
  }
}

function looksLikeLightMagentaGuide(r, g, b) {
  return r > 230 && b > 230 && g > 76 && Math.abs(r - b) < 24;
}

function clearPixel(processed, alphaMask, pixel) {
  processed[pixel * 4] = 0;
  processed[pixel * 4 + 1] = 0;
  processed[pixel * 4 + 2] = 0;
  processed[pixel * 4 + 3] = 0;
  alphaMask[pixel] = 0;
}

function mergeNearbyComponents(components, gap) {
  let changed = true;
  while (changed) {
    changed = false;
    outer:
    for (let i = 0; i < components.length; i += 1) {
      for (let j = i + 1; j < components.length; j += 1) {
        if (!shouldMerge(components[i], components[j], gap)) continue;
        components[i] = mergeBox(components[i], components[j]);
        components.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return components;
}

function shouldMerge(a, b, gap) {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.hypot(dx, dy) <= gap;
}

function mergeBox(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y, area: a.area + b.area };
}

function paddedBox(box, width, height, padding) {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(width, box.x + box.width + padding);
  const bottom = Math.min(height, box.y + box.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}
