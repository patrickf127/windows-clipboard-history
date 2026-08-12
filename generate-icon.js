const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const CX = (SIZE - 1) / 2;
const RADIUS = SIZE / 2 - 4;
const iconPath = path.join(__dirname, 'icon.png');

// 建立 raw pixel data (每個 row 先加 filter byte 0)
const rawData = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const rowOffset = y * (1 + SIZE * 4);
  rawData[rowOffset] = 0; // filter: None
  for (let x = 0; x < SIZE; x++) {
    const dx = x - CX, dy = y - CX;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const px = rowOffset + 1 + x * 4;
    if (dist < RADIUS) {
      rawData[px] = 147;     // R
      rawData[px + 1] = 197; // G
      rawData[px + 2] = 253; // B — 淡藍色
      rawData[px + 3] = 255; // A
    } else if (dist < RADIUS + 2) {
      // 邊緣半透明
      const alpha = Math.round(255 * (RADIUS + 2 - dist) / 2);
      rawData[px] = 147;
      rawData[px + 1] = 197;
      rawData[px + 2] = 253;
      rawData[px + 3] = alpha;
    } else {
      rawData[px + 3] = 0; // 透明
    }
  }
}

const deflated = zlib.deflateSync(rawData);

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', deflated),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(iconPath, png);
console.log('✅ icon.png 已建立 (256x256)');
