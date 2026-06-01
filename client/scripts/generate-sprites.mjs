/**
 * Generates pixel-art sprite sheets for the penalty game client.
 * Run: npm run sprites
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Vite copies `client/public/*` into `public/penalty/` at build time. */
const OUT_DIR = join(__dirname, "..", "public", "sprites");

const PALETTE = {
  ".": [0, 0, 0, 0],
  g: [45, 120, 62, 255],
  G: [34, 95, 48, 255],
  l: [74, 222, 128, 255],
  w: [255, 255, 255, 255],
  n: [200, 210, 220, 255],
  s: [245, 208, 168, 255],
  h: [61, 41, 20, 255],
  j: [251, 191, 36, 255],
  J: [217, 119, 6, 255],
  k: [30, 58, 95, 255],
  o: [17, 24, 39, 255],
  c: [34, 211, 238, 255],
  C: [6, 182, 212, 255],
  r: [239, 68, 68, 255],
  y: [250, 204, 21, 255],
  b: [255, 255, 255, 255],
  B: [229, 231, 235, 255],
  m: [148, 163, 184, 255],
  d: [100, 116, 139, 255],
};

function paintFrame(lines, scale = 2) {
  const h = lines.length;
  const w = lines[0].length;
  const outW = w * scale;
  const outH = h * scale;
  const pixels = new Uint8Array(outW * outH * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = lines[y][x];
      const rgba = PALETTE[ch] ?? PALETTE["."];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const ox = x * scale + sx;
          const oy = y * scale + sy;
          const i = (oy * outW + ox) * 4;
          pixels[i] = rgba[0];
          pixels[i + 1] = rgba[1];
          pixels[i + 2] = rgba[2];
          pixels[i + 3] = rgba[3];
        }
      }
    }
  }
  return { width: outW, height: outH, pixels };
}

function mirrorFrame(frame) {
  const { width, height, pixels } = frame;
  const out = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (y * width + (width - 1 - x)) * 4;
      out[dst] = pixels[src];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src + 2];
      out[dst + 3] = pixels[src + 3];
    }
  }
  return { width, height, pixels: out };
}

const KEEPER_IDLE_0 = [
  "..............hh..............",
  ".............hhhh.............",
  "............hhsshh............",
  "...........hhsssshh...........",
  "..........hhsssssshh..........",
  ".........hhsssssssshh.........",
  "........ccsssssssscc........",
  ".......cccssssssssccc.......",
  "......ccccsssssscccc......",
  ".....ccccjjjjjjcccc.....",
  "....ccccjjjjjjjjcccc....",
  "....cccjjjjjjjjjjccc....",
  "...cccjjjjjjjjjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjjjjjjjjjjjccc...",
  "...cccjjjjjjjjjjjjccc...",
  "...ccckkkkkkkkkkkkccc...",
  "...ccckkkkkkkkkkkkccc...",
  "...ccckkkkkkkkkkkkccc...",
  "....cckkkkkkkkkkkkcc....",
  "....cckkkkkkkkkkkkcc....",
  ".....ookkkkkkkkkoo.....",
  ".....ookkkkkkkkkoo.....",
  "......oooooooooo......",
  "......oooooooooo......",
  ".......oooooooo.......",
  "........oooooooo........",
];

const KEEPER_IDLE_1 = [
  "..............hh..............",
  ".............hhhh.............",
  "............hhsshh............",
  "...........hhsssshh...........",
  "..........hhsssssshh..........",
  ".........hhsssssssshh.........",
  "........ccsssssssscc........",
  ".......cccssssssssccc.......",
  "......ccccsssssscccc......",
  ".....ccccjjjjjjcccc.....",
  "....ccccjjjjjjjjcccc....",
  "....cccjjjjjjjjjjccc....",
  "...cccjjjjjjjjjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjjjjjjjjjjjccc...",
  "...cccjjjjjjjjjjjjccc...",
  "...ccckkkkkkkkkkkkccc...",
  "...ccckkkkkkkkkkkkccc...",
  "....cckkkkkkkkkkkkcc....",
  "....cckkkkkkkkkkkkcc....",
  ".....ookkkkkkkkkoo.....",
  ".....ookkkkkkkkkoo.....",
  "......oooooooooo......",
  "......oooooooooo......",
  ".......oooooooo.......",
  "........oooooooo........",
  ".........oooooooo.........",
];

const KEEPER_DIVE_0 = [
  "..............hh..............",
  ".............hhhh.............",
  "............hhsshh............",
  "...........hhsssshh...........",
  "..........hhsssssshh..........",
  ".........hhsssssssshh.........",
  "........ccsssssssscc........",
  ".......cccssssssssccc.......",
  "......ccccsssssscccc......",
  ".....ccccjjjjjjcccc.....",
  "....ccccjjjjjjjjcccc....",
  "....cccjjjjjjjjjjccc....",
  "...cccjjjjjjjjjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjJJjjJJjjjjccc...",
  "...cccjjjjjjjjjjjjccc...",
  "..cccjjjjjjjjjjjjccc..",
  ".cccjjjjjjjjjjjjccc.",
  ".ccckkkkkkkkkkkkccc.",
  "ccckkkkkkkkkkkkccc",
  "cckkkkkkkkkkkkcc",
  "ookkkkkkkkkkoo",
  "oooooooooooo",
  "oooooooooo",
  "oooooooo",
  "oooooo",
  "oooo",
  "oo",
];

const KEEPER_DIVE_1 = [
  "............hh................",
  "...........hhhh...............",
  "..........hhsshh..............",
  ".........hhsssshh.............",
  "........hhsssssshh............",
  ".......hhsssssssshh...........",
  "......ccsssssssscc..........",
  ".....cccssssssssccc.........",
  "....ccccsssssscccc........",
  "...ccccjjjjjjcccc.......",
  "..ccccjjjjjjjjcccc......",
  "..cccjjjjjjjjjjccc.....",
  ".cccjjjjjjjjjjjjccc....",
  ".cccjjJJjjJJjjjjccc....",
  "cccjjJJjjJJjjjjccc...",
  "cccjjjjjjjjjjjjccc...",
  "cccjjjjjjjjjjjjccc..",
  "ccckkkkkkkkkkkkccc.",
  "cckkkkkkkkkkkkcc",
  "ookkkkkkkkkoo",
  "oooooooooo",
  "oooooooo",
  "oooooo",
  "oooo",
  "oo",
  ".",
  ".",
  ".",
];

const KEEPER_DIVE_2 = [
  "......hh......................",
  ".....hhhh.....................",
  "....hhsshh....................",
  "...hhsssshh...................",
  "..hhsssssshh..................",
  ".hhsssssssshh.................",
  "ccsssssssscc................",
  "cccssssssssccc...............",
  "ccccsssssscccc..............",
  "ccccjjjjjjcccc.............",
  "cccjjjjjjjjccc............",
  "ccjjjjjjjjjjcc...........",
  "cjjJJjjJJjjjcc..........",
  "jjJJjjJJjjjjcc.........",
  "jjjjjjjjjjjjcc........",
  "kkkkkkkkkkkkc........",
  "kkkkkkkkkkkk.........",
  "kkkkkkkkkk............",
  "kkkkkkkk..............",
  "kkkkkk................",
  "kkkk..................",
  "kk....................",
  "......................",
  "......................",
  "......................",
  "......................",
  "......................",
  "......................",
];

function ballFrame(rot) {
  const size = 16;
  const lines = Array.from({ length: size }, () => ".".repeat(size));
  const cx = 7.5;
  const cy = 7.5;
  const r = 6.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > r) continue;
      const angle = Math.atan2(dy, dx) + rot;
      const patch = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 5) % 5;
      let ch = "B";
      if (dist > r - 1.2) ch = "o";
      else if (patch === 0) ch = "b";
      else if (patch === 2) ch = "m";
      lines[y] =
        lines[y].slice(0, x) + ch + lines[y].slice(x + 1);
    }
  }
  return lines;
}

function buildSheet(frames, frameNames) {
  const fw = frames[0].width;
  const fh = frames[0].height;
  const sheetW = fw * frames.length;
  const sheetH = fh;
  const sheet = new PNG({ width: sheetW, height: sheetH });

  const atlasFrames = {};
  const animations = {};

  frames.forEach((frame, i) => {
    const name = frameNames[i];
    atlasFrames[`${name}.png`] = {
      frame: { x: i * fw, y: 0, w: fw, h: fh },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
      sourceSize: { w: fw, h: fh },
    };

    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const si = (y * fw + x) * 4;
        const di = (y * sheetW + (i * fw + x)) * 4;
        sheet.data[di] = frame.pixels[si];
        sheet.data[di + 1] = frame.pixels[si + 1];
        sheet.data[di + 2] = frame.pixels[si + 2];
        sheet.data[di + 3] = frame.pixels[si + 3];
      }
    }
  });

  return { sheet, atlasFrames, fw, fh, sheetW, sheetH };
}

function buildAtlas(imageName, frameEntries, animationMap) {
  const { sheet, atlasFrames, sheetW, sheetH } = buildSheet(
    frameEntries.map((e) => e.frame),
    frameEntries.map((e) => e.name),
  );

  const animations = {};
  for (const [key, names] of Object.entries(animationMap)) {
    animations[key] = names.map((n) => `${n}.png`);
  }

  const atlas = {
    frames: atlasFrames,
    animations,
    meta: {
      app: "generate-sprites",
      version: "1.0",
      image: imageName,
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
    },
  };

  return { sheet, atlas };
}

function goalBurstFrame(t) {
  const size = 32;
  const lines = Array.from({ length: size }, () => ".".repeat(size));
  const cx = 15.5;
  const cy = 15.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const ring = 4 + t * 5;
      if (Math.abs(dist - ring) < 1.8 - t * 0.4) {
        lines[y] = lines[y].slice(0, x) + "y" + lines[y].slice(x + 1);
      } else if (dist < 3 + t * 2) {
        lines[y] = lines[y].slice(0, x) + "w" + lines[y].slice(x + 1);
      }
    }
  }
  return paintFrame(lines, 2);
}

function pitchImage() {
  const w = 640;
  const h = 360;
  const png = new PNG({ width: w, height: h });

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const stripe = Math.floor(y / 18) % 2 === 0;
      const base = stripe ? [45, 120, 62] : [34, 95, 48];
      let r = base[0];
      let g = base[1];
      let b = base[2];

      if (y < 70) {
        const crowd = ((x >> 4) + (y >> 2)) % 5;
        if (crowd === 0) [r, g, b] = [30, 41, 59];
        else if (crowd === 1) [r, g, b] = [51, 65, 85];
        else [r, g, b] = [71, 85, 105];
      }

      const lineWhite =
        (y > 68 && y < 72) ||
        (x > 40 && x < 44 && y > 60 && y < 280) ||
        (x > 596 && x < 600 && y > 60 && y < 280) ||
        (y > 276 && y < 280 && x > 40 && x < 600) ||
        (Math.abs(x - 320) < 2 && y > 120 && y < 280) ||
        (Math.abs(x - 180) < 2 && y > 200 && y < 280) ||
        (Math.abs(x - 460) < 2 && y > 200 && y < 280);

      if (lineWhite) [r, g, b] = [240, 244, 248];

      const i = (y * w + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

async function writePng(path, png) {
  const buffer = PNG.sync.write(png);
  await writeFile(path, buffer);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const keeperLeft = [
    { name: "idle_0", frame: paintFrame(KEEPER_IDLE_0) },
    { name: "idle_1", frame: paintFrame(KEEPER_IDLE_1) },
    { name: "dive_0", frame: paintFrame(KEEPER_DIVE_0) },
    { name: "dive_1", frame: paintFrame(KEEPER_DIVE_1) },
    { name: "dive_2", frame: paintFrame(KEEPER_DIVE_2) },
  ];
  const keeperRight = keeperLeft
    .filter((f) => f.name.startsWith("dive_"))
    .map((f) => ({
      name: f.name.replace("dive_", "dive_r_"),
      frame: mirrorFrame(f.frame),
    }));

  const keeperAll = [...keeperLeft, ...keeperRight];
  const { sheet: keeperPng, atlas: keeperAtlas } = buildAtlas(
    "keeper.png",
    keeperAll,
    {
      idle: ["idle_0", "idle_1"],
      dive_left: ["dive_0", "dive_1", "dive_2"],
      dive_right: ["dive_r_0", "dive_r_1", "dive_r_2"],
    },
  );

  const ballFrames = [0, 1, 2, 3, 4, 5].map((i) => ({
    name: `spin_${i}`,
    frame: paintFrame(ballFrame((i / 6) * Math.PI * 2)),
  }));
  const { sheet: ballPng, atlas: ballAtlas } = buildAtlas(
    "ball.png",
    ballFrames,
    {
      spin: ballFrames.map((f) => f.name),
      idle: ["spin_0"],
    },
  );

  const burstFrames = [0, 1, 2, 3].map((t) => ({
    name: `burst_${t}`,
    frame: goalBurstFrame(t),
  }));
  const { sheet: burstPng, atlas: burstAtlas } = buildAtlas(
    "goal-burst.png",
    burstFrames,
    { burst: burstFrames.map((f) => f.name) },
  );

  const pitchPng = pitchImage();

  await writePng(join(OUT_DIR, "keeper.png"), keeperPng);
  await writeFile(
    join(OUT_DIR, "keeper.json"),
    JSON.stringify(keeperAtlas, null, 2),
  );
  await writePng(join(OUT_DIR, "ball.png"), ballPng);
  await writeFile(
    join(OUT_DIR, "ball.json"),
    JSON.stringify(ballAtlas, null, 2),
  );
  await writePng(join(OUT_DIR, "goal-burst.png"), burstPng);
  await writeFile(
    join(OUT_DIR, "goal-burst.json"),
    JSON.stringify(burstAtlas, null, 2),
  );
  await writePng(join(OUT_DIR, "pitch.png"), pitchPng);

  console.log(`Sprites written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
