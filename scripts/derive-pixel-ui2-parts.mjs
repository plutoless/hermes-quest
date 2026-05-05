import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('src/assets/pixel-ui2');
const nineSliceRoot = path.join(root, '9-slice');
const derivedRoot = path.join(root, 'derived');
const slicesRoot = path.join(root, 'slices');
const uiSheet = '6c2a8a89-9ee9-4a85-a993-0d6df3e0741c';

const panelSources = {
  dark: '33a665a1-42fe-4b8a-9b16-f51ca7934051.png',
  parchment: '37c0fdb8-05a0-40ce-bd7f-953abfc4483a.png',
  review: '4f667a7d-5842-42b3-a66c-09acf6aa938e.png',
  note: '73a00ded-3e25-46b8-9c03-464789ca7450.png',
  inset: 'fcab108f-bed5-43fc-8e04-fe53aae9aa2f.png',
};

const controls = [
  ['primary', 29, 4, 24],
  ['secondary', 30, 4, 24],
  ['success', 31, 4, 24],
  ['danger', 32, 4, 24],
  ['ghost', 30, 4, 24],
  ['badgeIdle', 34, 1, 16],
  ['badgeRunning', 30, 4, 22],
  ['badgeReview', 38, 1, 16],
  ['badgeSuccess', 31, 4, 22],
  ['badgeWarning', 29, 4, 22],
  ['badgeError', 32, 4, 22],
  ['chip', 46, 1, 16],
  ['command', 44, 1, 20],
  ['select', 45, 1, 20],
];

await rm(derivedRoot, { recursive: true, force: true });
await mkdir(path.join(derivedRoot, 'panel'), { recursive: true });
await mkdir(path.join(derivedRoot, 'control'), { recursive: true });
await mkdir(path.join(derivedRoot, 'transparent-9-slice'), { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'src/assets/pixel-ui2/9-slice',
  panel: {},
  control: {},
};

for (const [name, file] of Object.entries(panelSources)) {
  const source = path.join(nineSliceRoot, file);
  const dir = path.join(derivedRoot, 'panel', name);
  await mkdir(dir, { recursive: true });

  const transparent = await transparentize(source);
  const transparentFile = path.join(derivedRoot, 'transparent-9-slice', file);
  await sharp(transparent.data, { raw: transparent.info }).png({ compressionLevel: 9 }).toFile(transparentFile);

  const components = findComponents(transparent.data, transparent.info)
    .filter((component) => component.area > 500)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (components.length !== 10) {
    throw new Error(`${file}: expected 10 components, found ${components.length}`);
  }

  const layout = classifyNineSlice(components);
  const edgeTile = Math.min(
    64,
    Math.max(24, Math.round(Math.min(layout.top.width, layout.left.height, layout.center.width, layout.center.height) * 0.18)),
  );
  const centerTile = edgeTile;

  const parts = {
    topLeft: await copyBox(transparent, dir, 'top-left', layout.topLeft),
    topRight: await copyBox(transparent, dir, 'top-right', layout.topRight),
    bottomLeft: await copyBox(transparent, dir, 'bottom-left', layout.bottomLeft),
    bottomRight: await copyBox(transparent, dir, 'bottom-right', layout.bottomRight),
    top: await copyBox(transparent, dir, 'top', horizontalEdgeBox(layout.top, edgeTile)),
    right: await copyBox(transparent, dir, 'right', verticalEdgeBox(layout.right, edgeTile)),
    bottom: await copyBox(transparent, dir, 'bottom', horizontalEdgeBox(layout.bottom, edgeTile)),
    left: await copyBox(transparent, dir, 'left', verticalEdgeBox(layout.left, edgeTile)),
    center: await copyBox(transparent, dir, 'center', centerBox(layout.center, centerTile)),
    ornament: await copyBox(transparent, dir, 'ornament', layout.ornament),
  };
  parts.nineSlice = await buildPreviewNineSlice(dir, parts);
  parts.transparentSource = path.relative(root, transparentFile);
  parts.source = `9-slice/${file}`;
  parts.sourceBoxes = layout;
  parts.border = {
    top: recommendedBorder(layout.topLeft.height),
    right: recommendedBorder(layout.topRight.width),
    bottom: recommendedBorder(layout.bottomLeft.height),
    left: recommendedBorder(layout.topLeft.width),
  };
  parts.ornamentSize = recommendedOrnament(layout.ornament);
  parts.ornamentAnchor = name === 'note'
    ? { top: '50%', right: '-12px', left: 'auto', transform: 'translate(50%, -50%)' }
    : { top: '-18px', right: 'auto', left: '50%', transform: 'translate(-50%, -50%)' };

  manifest.panel[name] = parts;
}

for (const [name, index, rows, cap] of controls) {
  const source = slicePath(index);
  const meta = await sharp(source).metadata();
  const rowHeight = Math.floor(meta.height / rows);
  const y = 0;
  const h = rowHeight;
  const midWidth = clamp(Math.round(meta.width * 0.08), 6, 14);
  const midX = Math.round((meta.width - midWidth) / 2);
  const capWidth = Math.min(cap, Math.floor(meta.width / 3));
  const dir = path.join(derivedRoot, 'control', name);
  await mkdir(dir, { recursive: true });
  const parts = {
    left: await extractFile(source, dir, 'left', { x: 0, y, width: capWidth, height: h }),
    middle: await extractFile(source, dir, 'middle', { x: midX, y, width: midWidth, height: h }),
    right: await extractFile(source, dir, 'right', { x: meta.width - capWidth, y, width: capWidth, height: h }),
  };
  manifest.control[name] = parts;
}

await writeFile(path.join(derivedRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`derived pixel-ui2 parts written to ${path.relative(process.cwd(), derivedRoot)}`);

async function transparentize(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = Buffer.from(data);
  for (let i = 0; i < cleaned.length; i += 4) {
    const r = cleaned[i];
    const g = cleaned[i + 1];
    const b = cleaned[i + 2];
    if (isKeyMagenta(r, g, b)) {
      cleaned[i] = 0;
      cleaned[i + 1] = 0;
      cleaned[i + 2] = 0;
      cleaned[i + 3] = 0;
    }
  }
  return { data: cleaned, info };
}

function findComponents(data, info) {
  const visible = new Uint8Array(info.width * info.height);
  for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
    visible[pixel] = data[i + 3] > 8 ? 1 : 0;
  }

  const seen = new Uint8Array(visible.length);
  const components = [];
  const stack = [];
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = y * info.width + x;
      if (!visible[index] || seen[index]) continue;
      seen[index] = 1;
      stack.push(index);
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      while (stack.length > 0) {
        const current = stack.pop();
        const cx = current % info.width;
        const cy = Math.floor(current / info.width);
        area += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
          const neighbor = ny * info.width + nx;
          if (visible[neighbor] && !seen[neighbor]) {
            seen[neighbor] = 1;
            stack.push(neighbor);
          }
        }
      }
      components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
    }
  }
  return components;
}

function classifyNineSlice(components) {
  const xClusters = clustersFor(components, 'x').filter((cluster) => cluster.items.length >= 3).slice(0, 3);
  const yClusters = clustersFor(components, 'y').filter((cluster) => cluster.items.length >= 3).slice(0, 3);
  if (xClusters.length !== 3 || yClusters.length !== 3) {
    throw new Error('could not classify 3x3 nine-slice grid');
  }

  const grid = new Map();
  for (const component of components) {
    const xIndex = xClusters.findIndex((cluster) => cluster.items.includes(component));
    const yIndex = yClusters.findIndex((cluster) => cluster.items.includes(component));
    if (xIndex >= 0 && yIndex >= 0) grid.set(`${xIndex},${yIndex}`, component);
  }

  const ornament = components.find((component) => ![...grid.values()].includes(component));
  if (!ornament || grid.size !== 9) throw new Error('could not isolate ornament from nine-slice grid');

  return {
    topLeft: grid.get('0,0'),
    top: grid.get('1,0'),
    topRight: grid.get('2,0'),
    left: grid.get('0,1'),
    center: grid.get('1,1'),
    right: grid.get('2,1'),
    bottomLeft: grid.get('0,2'),
    bottom: grid.get('1,2'),
    bottomRight: grid.get('2,2'),
    ornament,
  };
}

function clustersFor(components, axis) {
  const centerKey = axis === 'x' ? 'width' : 'height';
  const originKey = axis;
  const sorted = [...components].sort((a, b) => centerOf(a, originKey, centerKey) - centerOf(b, originKey, centerKey));
  const clusters = [];
  for (const item of sorted) {
    const center = centerOf(item, originKey, centerKey);
    const current = clusters.at(-1);
    if (current && Math.abs(center - current.center) < 96) {
      current.items.push(item);
      current.center = current.items.reduce((sum, next) => sum + centerOf(next, originKey, centerKey), 0) / current.items.length;
    } else {
      clusters.push({ center, items: [item] });
    }
  }
  return clusters.sort((a, b) => a.center - b.center);
}

function centerOf(component, originKey, sizeKey) {
  return component[originKey] + component[sizeKey] / 2;
}

function horizontalEdgeBox(box, width) {
  const left = Math.max(0, Math.round(box.width * 0.18));
  return { x: box.x + Math.min(left, box.width - width), y: box.y, width, height: box.height };
}

function verticalEdgeBox(box, height) {
  const top = Math.max(0, Math.round(box.height * 0.28));
  return { x: box.x, y: box.y + Math.min(top, box.height - height), width: box.width, height };
}

function centerBox(box, size) {
  return {
    x: box.x + Math.round((box.width - size) / 2),
    y: box.y + Math.round((box.height - size) / 2),
    width: size,
    height: size,
  };
}

async function copyBox(image, dir, name, box) {
  const file = `${name}.png`;
  const output = path.join(dir, file);
  await sharp(image.data, { raw: image.info })
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png({ compressionLevel: 9 })
    .toFile(output);
  return path.relative(root, output);
}

async function extractFile(source, dir, name, box) {
  const file = `${name}.png`;
  const output = path.join(dir, file);
  await sharp(source)
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png({ compressionLevel: 9 })
    .toFile(output);
  return path.relative(root, output);
}

async function buildPreviewNineSlice(dir, parts) {
  const meta = {
    topLeft: await sharp(path.join(root, parts.topLeft)).metadata(),
    top: await sharp(path.join(root, parts.top)).metadata(),
    topRight: await sharp(path.join(root, parts.topRight)).metadata(),
    left: await sharp(path.join(root, parts.left)).metadata(),
    center: await sharp(path.join(root, parts.center)).metadata(),
    right: await sharp(path.join(root, parts.right)).metadata(),
    bottomLeft: await sharp(path.join(root, parts.bottomLeft)).metadata(),
    bottom: await sharp(path.join(root, parts.bottom)).metadata(),
    bottomRight: await sharp(path.join(root, parts.bottomRight)).metadata(),
  };
  const width = meta.topLeft.width + meta.top.width + meta.topRight.width;
  const height = meta.topLeft.height + meta.left.height + meta.bottomLeft.height;
  const output = path.join(dir, 'nine-slice.png');
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: path.join(root, parts.topLeft), left: 0, top: 0 },
      { input: path.join(root, parts.top), left: meta.topLeft.width, top: 0 },
      { input: path.join(root, parts.topRight), left: meta.topLeft.width + meta.top.width, top: 0 },
      { input: path.join(root, parts.left), left: 0, top: meta.topLeft.height },
      { input: path.join(root, parts.center), left: meta.topLeft.width, top: meta.topLeft.height },
      { input: path.join(root, parts.right), left: meta.topLeft.width + meta.top.width, top: meta.topLeft.height },
      { input: path.join(root, parts.bottomLeft), left: 0, top: meta.topLeft.height + meta.left.height },
      { input: path.join(root, parts.bottom), left: meta.topLeft.width, top: meta.topLeft.height + meta.left.height },
      { input: path.join(root, parts.bottomRight), left: meta.topLeft.width + meta.bottom.width, top: meta.topLeft.height + meta.left.height },
    ])
    .png({ compressionLevel: 9 })
    .toFile(output);
  return path.relative(root, output);
}

function recommendedBorder(sourcePixels) {
  return clamp(Math.round(sourcePixels / 9), 22, 36);
}

function recommendedOrnament(box) {
  const width = clamp(Math.round(box.width / 3.8), 56, 112);
  return {
    width,
    height: Math.round((box.height / box.width) * width),
  };
}

function slicePath(index) {
  const stem = `${uiSheet}-${String(index).padStart(3, '0')}.png`;
  return path.join(slicesRoot, uiSheet, stem);
}

function isKeyMagenta(r, g, b) {
  return Math.hypot(r - 255, g, b - 255) <= 110;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
