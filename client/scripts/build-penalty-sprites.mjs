/**
 * Builds the penalty-game sprite sheets for the client by RECOLORING the
 * rendered source sprite sheets from the `penalties-game` Angular app and
 * repacking them into PixiJS-format atlases the client already consumes.
 *
 * Source (rendered, photo-real):
 *   goalkeeper/Mid      40 frames 100x200  -> "idle"        (yellow kit, red gloves)
 *   goalkeeper/L_Down   70 frames 300x200  -> "dive_left"
 *   goalkeeper/R_Down   70 frames 300x200  -> "dive_right"
 *   penaltie_ball.png   28x28 static       -> "spin" / "idle" (b/w ball)
 *
 * Recolor (chosen look):
 *   yellow kit  (hue ~40-70) -> dark charcoal
 *   red gloves  (hue ~0-18 / 340-360) -> orange
 *   ball dark patches -> orange/amber, white kept
 *
 * Output: client/public/sprites/{keeper,ball}.{png,json}
 * Run: npm run sprites:penalty
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "new",
  "landing-starter-renew",
  "src",
  "app",
  "penalties-game",
  "assets",
  "body",
);
const OUT_DIR = join(__dirname, "..", "public", "sprites");

// ---------- color helpers ----------
function rgb2hsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    switch (mx) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hsl2rgb(h, s, l) {
  h /= 360;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Recolor a single keeper pixel in place.
 * Yellow kit -> dark charcoal (keeps fold shading via lightness ramp).
 * Red gloves -> orange (keeps lightness/shape).
 * Everything else (skin, hair, boots, shadow) untouched.
 */
function recolorKeeperPixel(data, i) {
  const a = data[i + 3];
  if (a < 24) return;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const [h, s, l] = rgb2hsl(r, g, b);

  // Kit: vivid yellow. Skin sits lower (hue <38, lower saturation), so a
  // saturated band 38-80 isolates the jersey/shorts/socks.
  if (h >= 38 && h <= 80 && s >= 0.28) {
    // Map onto a dark charcoal ramp; preserve relative lightness for folds.
    const t = clamp(l * 1.15, 0, 1);
    data[i] = Math.round(16 + t * 52);
    data[i + 1] = Math.round(17 + t * 55);
    data[i + 2] = Math.round(22 + t * 66);
    return;
  }

  // Gloves: red. Recolor to orange, keep lightness so highlights survive.
  if ((h <= 18 || h >= 340) && s >= 0.35 && l < 0.72) {
    const [nr, ng, nb] = hsl2rgb(26, clamp(s, 0.6, 0.95), clamp(l, 0.32, 0.62));
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

/**
 * Recolor a shooter pixel: cyan jersey -> white kit (so the shooter reads as a
 * different team from the dark keeper). Navy shorts/boots, skin, socks kept.
 */
function recolorShooterPixel(data, i) {
  const a = data[i + 3];
  if (a < 24) return;
  const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
  // Jersey: cyan (hue ~165-205). Navy shorts sit at ~210-245 and are kept.
  if (h >= 160 && h <= 205 && s >= 0.18) {
    const [nr, ng, nb] = hsl2rgb(205, 0.05, clamp(l * 1.0 + 0.18, 0.55, 0.96));
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

/** Recolor a ball pixel: dark patches -> orange, white/gray kept. */
function recolorBallPixel(data, i) {
  const a = data[i + 3];
  if (a < 24) return;
  const [, , l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
  if (l < 0.4) {
    // dark patch / outline -> amber, shade by original darkness
    const t = clamp(l / 0.4, 0, 1);
    const [nr, ng, nb] = hsl2rgb(30, 0.95, clamp(0.34 + t * 0.18, 0.3, 0.55));
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

// ---------- source loading ----------
async function loadJson(path) {
  const txt = (await readFile(path, "utf8")).replace(/^﻿/, "");
  return JSON.parse(txt);
}

async function loadPng(path) {
  return PNG.sync.read(await readFile(path));
}

/**
 * Extract `count` evenly-spaced frames from a source sheet, optionally limiting
 * to the first `maxFrac` portion of the animation (to skip the recover tail).
 * Returns [{ w, h, pixels:Uint8Array(rgba) }].
 */
function extractFrames(png, atlas, count, recolor, maxFrac = 1) {
  const names = Object.keys(atlas.frames).sort();
  const usable = Math.max(1, Math.floor(names.length * maxFrac));
  const picked = [];
  for (let k = 0; k < count; k++) {
    const idx = Math.min(usable - 1, Math.round((k * (usable - 1)) / (count - 1 || 1)));
    picked.push(names[idx]);
  }
  return picked.map((name) => {
    const f = atlas.frames[name].frame;
    const out = new Uint8Array(f.w * f.h * 4);
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const si = ((f.y + y) * png.width + (f.x + x)) * 4;
        const di = (y * f.w + x) * 4;
        out[di] = png.data[si];
        out[di + 1] = png.data[si + 1];
        out[di + 2] = png.data[si + 2];
        out[di + 3] = png.data[si + 3];
        recolor(out, di);
      }
    }
    return { w: f.w, h: f.h, pixels: out };
  });
}

/** Rotate an rgba frame around its center by `angle` radians (nearest-neighbor). */
function rotateFrame(frame, angle) {
  const { w, h, pixels } = frame;
  const out = new Uint8Array(pixels.length);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = Math.round(cx + dx * cos - dy * sin);
      const sy = Math.round(cy + dx * sin + dy * cos);
      const di = (y * w + x) * 4;
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      const si = (sy * w + sx) * 4;
      out[di] = pixels[si];
      out[di + 1] = pixels[si + 1];
      out[di + 2] = pixels[si + 2];
      out[di + 3] = pixels[si + 3];
    }
  }
  return { w, h, pixels: out };
}

// ---------- packing ----------
/**
 * Shelf-pack named frames into one sheet. `groups` is an ordered list of
 * { key, frames:[{w,h,pixels}] }. Returns { png, atlas } in PixiJS format.
 */
function packAtlas(imageName, groups, maxWidth = 2400) {
  // assign positions (one shelf row per group keeps it simple & predictable)
  const placements = [];
  let sheetW = 0;
  let cursorY = 0;
  for (const group of groups) {
    let x = 0;
    let rowH = 0;
    group.frames.forEach((fr, i) => {
      if (x + fr.w > maxWidth && x > 0) {
        cursorY += rowH;
        x = 0;
        rowH = 0;
      }
      placements.push({ key: group.key, i, x, y: cursorY, fr });
      x += fr.w;
      rowH = Math.max(rowH, fr.h);
      sheetW = Math.max(sheetW, x);
    });
    cursorY += rowH;
  }
  const sheetH = cursorY;

  const png = new PNG({ width: sheetW, height: sheetH });
  png.data.fill(0);
  const frames = {};
  const animations = {};

  for (const p of placements) {
    const name = `${p.key}_${p.i}`;
    frames[`${name}.png`] = {
      frame: { x: p.x, y: p.y, w: p.fr.w, h: p.fr.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.fr.w, h: p.fr.h },
      sourceSize: { w: p.fr.w, h: p.fr.h },
    };
    (animations[p.key] ??= []).push(`${name}.png`);
    for (let y = 0; y < p.fr.h; y++) {
      for (let x = 0; x < p.fr.w; x++) {
        const si = (y * p.fr.w + x) * 4;
        const di = ((p.y + y) * sheetW + (p.x + x)) * 4;
        png.data[di] = p.fr.pixels[si];
        png.data[di + 1] = p.fr.pixels[si + 1];
        png.data[di + 2] = p.fr.pixels[si + 2];
        png.data[di + 3] = p.fr.pixels[si + 3];
      }
    }
  }

  const atlas = {
    frames,
    animations,
    meta: {
      app: "build-penalty-sprites",
      version: "1.0",
      image: imageName,
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
    },
  };
  return { png, atlas };
}

/** Crop a rectangle out of a loaded PNG into a new PNG. */
function cropPng(png, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * png.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

async function writeSheet(name, png, atlas) {
  await writeFile(join(OUT_DIR, `${name}.png`), PNG.sync.write(png));
  await writeFile(
    join(OUT_DIR, `${name}.json`),
    JSON.stringify(atlas, null, 2),
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // ----- keeper -----
  const midPng = await loadPng(join(SRC, "goalkeeper", "Mid.png"));
  const midAtlas = await loadJson(join(SRC, "goalkeeper", "Mid.json"));
  const lPng = await loadPng(join(SRC, "goalkeeper", "L_Down.png"));
  const lAtlas = await loadJson(join(SRC, "goalkeeper", "L_Down.json"));
  const rPng = await loadPng(join(SRC, "goalkeeper", "R_Down.png"));
  const rAtlas = await loadJson(join(SRC, "goalkeeper", "R_Down.json"));

  const idle = extractFrames(midPng, midAtlas, 8, recolorKeeperPixel);
  // dives are one-shot; use the first ~65% (dive-out + reach), skip recovery.
  const diveLeft = extractFrames(lPng, lAtlas, 8, recolorKeeperPixel, 0.65);
  const diveRight = extractFrames(rPng, rAtlas, 8, recolorKeeperPixel, 0.65);

  const keeper = packAtlas("keeper.png", [
    { key: "idle", frames: idle },
    { key: "dive_left", frames: diveLeft },
    { key: "dive_right", frames: diveRight },
  ]);
  await writeSheet("keeper", keeper.png, keeper.atlas);

  // ----- ball -----
  const ballSrc = await loadPng(join(SRC, "penaltie_ball.png"));
  const ballBase = {
    w: ballSrc.width,
    h: ballSrc.height,
    pixels: new Uint8Array(ballSrc.data.length),
  };
  ballBase.pixels.set(ballSrc.data);
  for (let i = 0; i < ballBase.pixels.length; i += 4) {
    recolorBallPixel(ballBase.pixels, i);
  }
  const SPIN = 8;
  const spin = Array.from({ length: SPIN }, (_, k) =>
    rotateFrame(ballBase, (k / SPIN) * Math.PI * 2),
  );
  const ball = packAtlas(
    "ball.png",
    [
      { key: "spin", frames: spin },
      { key: "idle", frames: [ballBase] },
    ],
    512,
  );
  await writeSheet("ball", ball.png, ball.atlas);

  // ----- shooter (penalty taker, viewed from behind) -----
  const standPng = await loadPng(join(SRC, "player", "Stand.png"));
  const standAtlas = await loadJson(join(SRC, "player", "Stand.json"));
  const shootPng = await loadPng(join(SRC, "player", "Shoot.png"));
  const shootAtlas = await loadJson(join(SRC, "player", "Shoot.json"));

  const shooterIdle = extractFrames(standPng, standAtlas, 6, recolorShooterPixel);
  const shooterShoot = extractFrames(shootPng, shootAtlas, 10, recolorShooterPixel);
  const shooter = packAtlas("shooter.png", [
    { key: "idle", frames: shooterIdle },
    { key: "shoot", frames: shooterShoot },
  ]);
  await writeSheet("shooter", shooter.png, shooter.atlas);

  // ----- goal / "football gate" -----
  // Crop the net (with a thin green margin) from the rendered ground image and
  // overlay it on the client's computed goal rect. Box from visual inspection
  // of penaltie_ground.png (500x850): crossbar..post-base, full mouth width.
  const groundPng = await loadPng(
    join(SRC, "background", "penaltie_ground.png"),
  );
  const goalBox = { x: 14, y: 210, w: 472, h: 184 };
  const goalPng = cropPng(
    groundPng,
    goalBox.x,
    goalBox.y,
    goalBox.w,
    goalBox.h,
  );
  await writeFile(join(OUT_DIR, "goal.png"), PNG.sync.write(goalPng));

  console.log("Penalty sprites written to", OUT_DIR);
  console.log(
    `  keeper: idle=${idle.length} dive_left=${diveLeft.length} dive_right=${diveRight.length} (${keeper.atlas.meta.size.w}x${keeper.atlas.meta.size.h})`,
  );
  console.log(
    `  ball: spin=${spin.length} (${ball.atlas.meta.size.w}x${ball.atlas.meta.size.h})`,
  );
  console.log(
    `  shooter: idle=${shooterIdle.length} shoot=${shooterShoot.length} (${shooter.atlas.meta.size.w}x${shooter.atlas.meta.size.h})`,
  );
  console.log(`  goal: ${goalBox.w}x${goalBox.h}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
