// One-off generator for app/favicon.ico — a 32x32 ICO with embedded BMP
// matching the F design in app/icon.svg. Run with `node scripts/build-favicon.js`.

const fs = require("fs");
const path = require("path");

const W = 32;
const H = 32;

const BG = { r: 0x0b, g: 0x0b, b: 0x0f };
const FG = { r: 0xe5, g: 0x09, b: 0x14 };

// Same path as app/icon.svg: M9 6h14v5h-9v3h7v5h-7v7h-5z
function isF(x, y) {
  if (x >= 9 && x < 14 && y >= 6 && y < 26) return true;
  if (x >= 14 && x < 23 && y >= 6 && y < 11) return true;
  if (x >= 14 && x < 21 && y >= 14 && y < 19) return true;
  return false;
}

const xor = Buffer.alloc(W * H * 4);
for (let row = 0; row < H; row++) {
  for (let col = 0; col < W; col++) {
    const x = col;
    const y = H - 1 - row;
    const c = isF(x, y) ? FG : BG;
    const i = (row * W + col) * 4;
    xor[i + 0] = c.b;
    xor[i + 1] = c.g;
    xor[i + 2] = c.r;
    xor[i + 3] = 0xff;
  }
}

const andMask = Buffer.alloc((W * H) / 8, 0);

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(W === 256 ? 0 : W, 0);
entry.writeUInt8(H === 256 ? 0 : H, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
const bmpHeader = 40;
const imageSize = bmpHeader + xor.length + andMask.length;
entry.writeUInt32LE(imageSize, 8);
entry.writeUInt32LE(6 + 16, 12);

const info = Buffer.alloc(40);
info.writeUInt32LE(40, 0);
info.writeInt32LE(W, 4);
info.writeInt32LE(H * 2, 8);
info.writeUInt16LE(1, 12);
info.writeUInt16LE(32, 14);
info.writeUInt32LE(0, 16);
info.writeUInt32LE(xor.length + andMask.length, 20);
info.writeInt32LE(0, 24);
info.writeInt32LE(0, 28);
info.writeUInt32LE(0, 32);
info.writeUInt32LE(0, 36);

const ico = Buffer.concat([dir, entry, info, xor, andMask]);
const out = path.join(__dirname, "..", "app", "favicon.ico");
fs.writeFileSync(out, ico);
console.log("Wrote", out, ico.length, "bytes");
