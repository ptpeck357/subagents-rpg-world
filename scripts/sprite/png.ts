// Pure-TS PNG encoder. RGBA only (color type 6, 8-bit), single IDAT chunk.

import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function be32(n: number): Uint8Array {
    return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) typeBytes[i] = type.charCodeAt(i);
    const crcInput = new Uint8Array(typeBytes.length + data.length);
    crcInput.set(typeBytes, 0);
    crcInput.set(data, typeBytes.length);
    const out = new Uint8Array(4 + 4 + data.length + 4);
    out.set(be32(data.length), 0);
    out.set(typeBytes, 4);
    out.set(data, 8);
    out.set(be32(crc32(crcInput)), 8 + data.length);
    return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
    const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = new Uint8Array(13);
    ihdr.set(be32(width), 0);
    ihdr.set(be32(height), 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const stride = width * 4;
    const raw = new Uint8Array((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;
        raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
    }
    const idat = new Uint8Array(deflateSync(raw));
    const ihdrC = chunk('IHDR', ihdr);
    const idatC = chunk('IDAT', idat);
    const iendC = chunk('IEND', new Uint8Array(0));
    const out = new Uint8Array(sig.length + ihdrC.length + idatC.length + iendC.length);
    let off = 0;
    out.set(sig, off);
    off += sig.length;
    out.set(ihdrC, off);
    off += ihdrC.length;
    out.set(idatC, off);
    off += idatC.length;
    out.set(iendC, off);
    return out;
}
