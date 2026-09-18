import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function drawIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });

  // Scale factor
  const scale = size / 512;
  const padding = isMaskable ? size * 0.15 : 0;
  const innerSize = size - padding * 2;
  const s = innerSize / 512;
  const offsetX = padding;
  const offsetY = padding;

  // Background colors: #2563eb (37, 99, 235) to #1d4ed8 (29, 78, 216)
  const bgR1 = 37, bgG1 = 99, bgB1 = 235;
  const bgR2 = 29, bgG2 = 78, bgB2 = 216;

  // Document colors: White (255, 255, 255)
  // Badge color: #1e40af (30, 64, 175)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Maskable has solid bleed background, normal icon has rounded rect corners
      let insideBg = true;
      if (!isMaskable) {
        const radius = 96 * scale;
        const cx = Math.min(Math.max(x, radius), size - radius);
        const cy = Math.min(Math.max(y, radius), size - radius);
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > radius) {
          insideBg = false;
        }
      }

      if (!insideBg) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Linear gradient for background
      const t = (x + y) / (size * 2);
      let r = Math.round(bgR1 + (bgR2 - bgR1) * t);
      let g = Math.round(bgG1 + (bgG2 - bgG1) * t);
      let b = Math.round(bgB1 + (bgB2 - bgB1) * t);
      let a = 255;

      // Coordinate in inner 512x512 space
      const ix = (x - offsetX) / s;
      const iy = (y - offsetY) / s;

      // Document shape: x: 130 to 382, y: 90 to 422
      const docLeft = 130;
      const docRight = 382;
      const docTop = 90;
      const docBottom = 422;
      const foldX = 310;
      const foldY = 162;

      let inDoc = false;
      if (ix >= docLeft && ix <= docRight && iy >= docTop && iy <= docBottom) {
        // Check top right cut
        if (!(ix >= foldX && iy <= foldY && (ix - foldX) + (foldY - iy) > (docRight - foldX))) {
          inDoc = true;
        }
      }

      if (inDoc) {
        // Document white paper
        r = 255;
        g = 255;
        b = 255;

        // Folded corner shadow / flap
        if (ix >= foldX && iy <= foldY) {
          r = 203;
          g = 213;
          b = 225;
        }

        // Top horizontal title bar
        if (ix >= 160 && ix <= 280 && iy >= 200 && iy <= 218) {
          r = 59; g = 130; b = 246; // Blue title bar
        }
        // Content lines
        if (ix >= 160 && ix <= 350 && iy >= 238 && iy <= 250) {
          r = 203; g = 213; b = 225;
        }
        if (ix >= 160 && ix <= 320 && iy >= 266 && iy <= 278) {
          r = 203; g = 213; b = 225;
        }

        // DOCX badge rectangle: x: 170 to 342, y: 310 to 385
        if (ix >= 170 && ix <= 342 && iy >= 310 && iy <= 385) {
          r = 30; g = 64; b = 175; // Deep navy blue badge

          // Draw a stylized 'W' in white inside the badge
          const wx = ix - 195;
          const wy = iy - 325;
          // Simple bold W stroke approximation
          if (wx >= 0 && wx <= 45 && wy >= 0 && wy <= 45) {
            // W legs
            if (
              (wx >= 0 && wx <= 10 && wy <= 40) ||
              (wx >= 35 && wx <= 45 && wy <= 40) ||
              (Math.abs((wx - 10) - wy * 0.3) < 4 && wy >= 10 && wy <= 40) ||
              (Math.abs((35 - wx) - wy * 0.3) < 4 && wy >= 10 && wy <= 40)
            ) {
              r = 255; g = 255; b = 255;
            }
          }
          // DOCX text hint (dots)
          if (ix >= 255 && ix <= 325 && iy >= 335 && iy <= 360) {
            r = 241; g = 245; b = 249;
          }
        }
      }

      // Sparkle star near top right: center around 400, 100
      const starDx = Math.abs(ix - 400);
      const starDy = Math.abs(iy - 100);
      if ((starDx < 4 && starDy < 24) || (starDy < 4 && starDx < 24) || (starDx + starDy < 14)) {
        r = 251; g = 191; b = 36; // Amber gold
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. 192x192
const p192 = drawIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), PNG.sync.write(p192));
console.log('Created pwa-192x192.png');

// 2. 512x512
const p512 = drawIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), PNG.sync.write(p512));
console.log('Created pwa-512x512.png');

// 3. 512x512 Maskable (with safe zone bleed)
const pMask = drawIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), PNG.sync.write(pMask));
console.log('Created pwa-maskable-512x512.png');

// 4. Apple Touch Icon (180x180)
const p180 = drawIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), PNG.sync.write(p180));
console.log('Created apple-touch-icon.png');

// 5. Favicon (64x64 PNG copied or written as favicon.ico)
const p64 = drawIcon(64, false);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), PNG.sync.write(p64));
console.log('Created favicon.ico');
