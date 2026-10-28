// Visual look-alikes: rasterise each kanji's KanjiVG strokes, blur, and correlate, then blend with KRADFILE
// component overlap. This finds 末/未 and 土/士, which share no component that would make them "related".

const N = 32; // raster size
const BOX = 109; // KanjiVG viewBox

/** SVG path data → polylines in KanjiVG coordinates. Handles the commands KanjiVG uses: M m C c S s L l H h V v Z z. */
export function flatten(d: string): [number, number][][] {
  const tok = d.match(/[MmCcSsLlHhVvZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const lines: [number, number][][] = [];
  let line: [number, number][] = [];
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, cmd = "", i = 0;
  const num = () => Number(tok[i++]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let t = 1; t <= 8; t++) {
      const u = t / 8, v = 1 - u;
      line.push([v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
        v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3]);
    }
    cx = x2; cy = y2; x = x3; y = y3;
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i]!)) cmd = tok[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        if (line.length) lines.push(line);
        x = ox + num(); y = oy + num(); sx = x; sy = y; cx = x; cy = y;
        line = [[x, y]];
        cmd = rel ? "l" : "L"; // further pairs after M are line-tos
        break;
      case "L": x = ox + num(); y = oy + num(); cx = x; cy = y; line.push([x, y]); break;
      case "H": x = ox + num(); cx = x; line.push([x, y]); break;
      case "V": y = oy + num(); cy = y; line.push([x, y]); break;
      case "C": { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()] as const; cubic(...a); break; }
      case "S": { const x1 = 2 * x - cx, y1 = 2 * y - cy; const a = [ox + num(), oy + num(), ox + num(), oy + num()] as const; cubic(x1, y1, ...a); break; }
      case "Z": x = sx; y = sy; line.push([x, y]); break;
      default: i++; // unknown token: skip rather than loop forever
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function raster(paths: string[]): Float32Array {
  const img = new Float32Array(N * N);
  const r = 1.1; // stroke radius in raster pixels
  const s = N / BOX;
  for (const d of paths) {
    for (const line of flatten(d)) {
      for (let j = 1; j < line.length; j++) {
        const [x0, y0] = line[j - 1]!, [x1, y1] = line[j]!;
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * s * 2));
        for (let t = 0; t <= steps; t++) {
          const px = (x0 + ((x1 - x0) * t) / steps) * s, py = (y0 + ((y1 - y0) * t) / steps) * s;
          for (let yy = Math.floor(py - r); yy <= Math.ceil(py + r); yy++)
            for (let xx = Math.floor(px - r); xx <= Math.ceil(px + r); xx++)
              if (xx >= 0 && yy >= 0 && xx < N && yy < N && (xx + 0.5 - px) ** 2 + (yy + 0.5 - py) ** 2 <= r * r) img[yy * N + xx] = 1;
        }
      }
    }
  }
  // Two passes of a 3×3 box blur so near-misses still overlap.
  let a = img;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < N && Y < N) { sum += a[Y * N + X]!; n++; }
      }
      b[y * N + x] = sum / n;
    }
    a = b;
  }
  // Centre and normalise, so a dot product is a correlation.
  let mean = 0;
  for (const v of a) mean += v;
  mean /= a.length;
  let norm = 0;
  for (let k = 0; k < a.length; k++) { a[k]! -= mean; norm += a[k]! ** 2; }
  norm = Math.sqrt(norm) || 1;
  for (let k = 0; k < a.length; k++) a[k]! /= norm;
  return a;
}

export function similarity(
  order: string[],
  strokes: Record<string, string[]>,
  comps: (k: string) => string[],
  strokeCount: (k: string) => number,
  top = 12,
): Map<string, string[]> {
  const vec = order.map((k) => raster(strokes[k] ?? []));
  const cs = order.map((k) => new Set(comps(k)));
  const out = new Map<string, string[]>();
  for (let a = 0; a < order.length; a++) {
    const scored: [number, number][] = [];
    for (let b = 0; b < order.length; b++) {
      if (a === b) continue;
      let dot = 0;
      const va = vec[a]!, vb = vec[b]!;
      for (let k = 0; k < va.length; k++) dot += va[k]! * vb[k]!;
      let inter = 0;
      for (const c of cs[a]!) if (cs[b]!.has(c)) inter++;
      const union = cs[a]!.size + cs[b]!.size - inter;
      const jac = union ? inter / union : 0;
      const ds = Math.abs(strokeCount(order[a]!) - strokeCount(order[b]!));
      scored.push([0.7 * dot + 0.3 * jac - 0.03 * ds, b]);
    }
    scored.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    out.set(order[a]!, scored.slice(0, top).map(([, b]) => order[b]!));
  }
  return out;
}
