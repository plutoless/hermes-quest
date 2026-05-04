#!/usr/bin/env python3
from __future__ import annotations

import struct
import sys
import zlib
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = [
    ROOT / "src/assets/pixel-ui/icons",
    ROOT / "src/assets/pixel-ui/avatars",
    ROOT / "src/assets/pixel-ui/mascots",
]


def read_png(path: Path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: not a PNG")

    pos = 8
    width = height = color_type = None
    compressed = bytearray()
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + length]
        pos += 12 + length

        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", payload)
            if bit_depth != 8 or compression != 0 or filter_method != 0 or interlace != 0:
                raise ValueError(f"{path}: unsupported PNG format")
            if color_type not in (2, 6):
                raise ValueError(f"{path}: unsupported color type {color_type}")
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break

    if width is None or height is None or color_type is None:
        raise ValueError(f"{path}: missing IHDR")

    channels = 4 if color_type == 6 else 3
    raw = zlib.decompress(bytes(compressed))
    stride = width * channels
    rows = []
    prev = [0] * stride
    i = 0

    for _ in range(height):
        filter_type = raw[i]
        i += 1
        scan = list(raw[i : i + stride])
        i += stride
        out = [0] * stride

        for x, value in enumerate(scan):
            left = out[x - channels] if x >= channels else 0
            up = prev[x]
            up_left = prev[x - channels] if x >= channels else 0

            if filter_type == 0:
                recon = value
            elif filter_type == 1:
                recon = value + left
            elif filter_type == 2:
                recon = value + up
            elif filter_type == 3:
                recon = value + ((left + up) // 2)
            elif filter_type == 4:
                p = left + up - up_left
                pa = abs(p - left)
                pb = abs(p - up)
                pc = abs(p - up_left)
                predictor = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
                recon = value + predictor
            else:
                raise ValueError(f"{path}: unsupported filter {filter_type}")
            out[x] = recon & 255

        rows.append(out)
        prev = out

    pixels = []
    for row in rows:
        out_row = []
        for x in range(0, len(row), channels):
            if channels == 4:
                out_row.append([row[x], row[x + 1], row[x + 2], row[x + 3]])
            else:
                out_row.append([row[x], row[x + 1], row[x + 2], 255])
        pixels.append(out_row)
    return width, height, pixels


def write_png(path: Path, width: int, height: int, pixels):
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    payload = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    path.write_bytes(payload)


def color_distance(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def edge_background_color(pixels, width, height):
    samples = []
    for x in range(width):
        samples.append(tuple(pixels[0][x][:3]))
        samples.append(tuple(pixels[height - 1][x][:3]))
    for y in range(height):
        samples.append(tuple(pixels[y][0][:3]))
        samples.append(tuple(pixels[y][width - 1][:3]))
    samples.sort()
    return samples[len(samples) // 2]


def transparent_flood_fill(pixels, width, height):
    bg = edge_background_color(pixels, width, height)
    tolerance = 74
    queue = deque()
    seen = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= width or y >= height:
            continue
        seen.add((x, y))
        pixel = pixels[y][x]
        if pixel[3] == 0 or color_distance(pixel, bg) > tolerance:
            continue
        pixel[3] = 0
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))


def alpha_bbox(pixels, width, height):
    xs = []
    ys = []
    for y, row in enumerate(pixels):
        for x, pixel in enumerate(row):
            if pixel[3] > 0:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def remove_small_or_label_components(pixels, width, height, keep_all: bool):
    if keep_all:
        return

    seen = set()
    components = []
    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[y][x][3] == 0:
                continue
            queue = deque([(x, y)])
            seen.add((x, y))
            coords = []
            while queue:
                cx, cy = queue.popleft()
                coords.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and pixels[ny][nx][3] > 0:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            components.append(coords)

    if not components:
        return

    largest = max(components, key=len)
    lx0 = min(x for x, _ in largest)
    ly0 = min(y for _, y in largest)
    lx1 = max(x for x, _ in largest) + 1
    ly1 = max(y for _, y in largest) + 1
    keep = set(largest)

    for comp in components:
        if comp is largest:
            continue
        x0 = min(x for x, _ in comp)
        y0 = min(y for _, y in comp)
        x1 = max(x for x, _ in comp) + 1
        y1 = max(y for _, y in comp) + 1
        area = len(comp)
        near_primary = not (x1 < lx0 - 12 or x0 > lx1 + 12 or y1 < ly0 - 12 or y0 > ly1 + 12)
        likely_label = y0 > height * 0.72 and area < len(largest) * 0.35
        if near_primary and not likely_label:
            keep.update(comp)

    for y in range(height):
        for x in range(width):
            if pixels[y][x][3] > 0 and (x, y) not in keep:
                pixels[y][x][3] = 0


def trim_to_bbox(pixels, width, height, padding):
    bbox = alpha_bbox(pixels, width, height)
    if not bbox:
        return width, height, pixels
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(width, x1 + padding)
    y1 = min(height, y1 + padding)
    return x1 - x0, y1 - y0, [row[x0:x1] for row in pixels[y0:y1]]


def process(path: Path):
    width, height, pixels = read_png(path)
    transparent_flood_fill(pixels, width, height)
    is_avatar = "/avatars/" in str(path)
    remove_small_or_label_components(pixels, width, height, keep_all=is_avatar)
    padding = 6 if is_avatar else 4
    new_width, new_height, new_pixels = trim_to_bbox(pixels, width, height, padding)
    write_png(path, new_width, new_height, new_pixels)
    return width, height, new_width, new_height


def main():
    changed = []
    for directory in TARGET_DIRS:
        for path in sorted(directory.glob("*.png")):
            before_w, before_h, after_w, after_h = process(path)
            changed.append(f"{path.relative_to(ROOT)}: {before_w}x{before_h} -> {after_w}x{after_h}")
    print("\n".join(changed))


if __name__ == "__main__":
    sys.exit(main())
