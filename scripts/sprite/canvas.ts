// RGBA color helpers + a tiny pixel-buffer Canvas with the primitives
// every sprite recipe needs: setPx, fillRect, fillEllipse, line, triangle,
// dither, outline.

export type RGBA = [number, number, number, number];

export function hex(h: string, a = 255): RGBA {
    const v = parseInt(h.replace('#', ''), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, a];
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
    return [
        Math.round(a[0] * (1 - t) + b[0] * t),
        Math.round(a[1] * (1 - t) + b[1] * t),
        Math.round(a[2] * (1 - t) + b[2] * t),
        Math.round(a[3] * (1 - t) + b[3] * t),
    ];
}

export function darken(c: RGBA, t: number): RGBA {
    return mix(c, [0, 0, 0, c[3]], t);
}

export function lighten(c: RGBA, t: number): RGBA {
    return mix(c, [255, 255, 255, c[3]], t);
}

export class Canvas {
    w: number;
    h: number;
    buf: Uint8Array;
    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.buf = new Uint8Array(w * h * 4);
    }
    px(x: number, y: number, c: RGBA): void {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        if (c[3] === 0) return;
        const i = (y * this.w + x) * 4;
        if (c[3] === 255) {
            this.buf[i] = c[0];
            this.buf[i + 1] = c[1];
            this.buf[i + 2] = c[2];
            this.buf[i + 3] = 255;
            return;
        }
        const a = c[3] / 255;
        const ba = this.buf[i + 3] / 255;
        const oa = a + ba * (1 - a);
        if (oa === 0) return;
        this.buf[i] = Math.round((c[0] * a + this.buf[i] * ba * (1 - a)) / oa);
        this.buf[i + 1] = Math.round((c[1] * a + this.buf[i + 1] * ba * (1 - a)) / oa);
        this.buf[i + 2] = Math.round((c[2] * a + this.buf[i + 2] * ba * (1 - a)) / oa);
        this.buf[i + 3] = Math.round(oa * 255);
    }
    rect(x: number, y: number, w: number, h: number, c: RGBA): void {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    }
    ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
        const x0 = Math.floor(cx - rx),
            x1 = Math.ceil(cx + rx);
        const y0 = Math.floor(cy - ry),
            y1 = Math.ceil(cy + ry);
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const dx = (x - cx) / rx,
                    dy = (y - cy) / ry;
                if (dx * dx + dy * dy <= 1) this.px(x, y, c);
            }
        }
    }
    line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0),
            sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0),
            sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            this.px(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
    }
    tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGBA): void {
        const minY = Math.min(y0, y1, y2);
        const maxY = Math.max(y0, y1, y2);
        for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
            const xs: number[] = [];
            const edges: [number, number, number, number][] = [
                [x0, y0, x1, y1],
                [x1, y1, x2, y2],
                [x2, y2, x0, y0],
            ];
            for (const [ax, ay, bx, by] of edges) {
                if ((ay <= y && by > y) || (by <= y && ay > y)) {
                    const t = (y - ay) / (by - ay);
                    xs.push(ax + (bx - ax) * t);
                }
            }
            if (xs.length >= 2) {
                xs.sort((a, b) => a - b);
                const lo = Math.floor(xs[0]),
                    hi = Math.ceil(xs[xs.length - 1]);
                for (let x = lo; x <= hi; x++) this.px(x, y, c);
            }
        }
    }
    dither(x: number, y: number, w: number, h: number, c: RGBA): void {
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                if ((i + j) % 2 === 0) this.px(x + i, y + j, c);
            }
        }
    }
    outline(x: number, y: number, w: number, h: number, c: RGBA): void {
        for (let i = 0; i < w; i++) {
            this.px(x + i, y, c);
            this.px(x + i, y + h - 1, c);
        }
        for (let j = 0; j < h; j++) {
            this.px(x, y + j, c);
            this.px(x + w - 1, y + j, c);
        }
    }
}
