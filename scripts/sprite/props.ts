// Free-standing prop sprites: trees, rocks, furniture. Each prop is one
// function (signature `(c: Canvas) => void`) so the recipe table just maps
// sprite key → { w, h, draw }.

import { Canvas, darken, hex, lighten } from './canvas';
import { P } from './palette';

export type PropRecipe = { w: number; h: number; draw: (c: Canvas) => void };

export const props: Record<string, PropRecipe> = {
    tree: { w: 52, h: 72, draw: drawTree },
    rock: { w: 30, h: 24, draw: drawRock },
    flower: { w: 14, h: 18, draw: drawFlower },
    table: { w: 56, h: 34, draw: drawTable },
    skill_item: { w: 30, h: 30, draw: drawSkillItem },
    bookshelf: { w: 120, h: 80, draw: drawBookshelf },
    rug: { w: 140, h: 90, draw: drawRug },
    lamp: { w: 18, h: 44, draw: drawLamp },
    plant: { w: 30, h: 46, draw: drawPlant },
    crate: { w: 36, h: 32, draw: drawCrate },
};

function drawTree(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 3, W / 2 - 4, 4, P.shadow);
    const trunkX = Math.floor(W / 2) - 3;
    const trunkH = 20;
    c.rect(trunkX, H - trunkH - 4, 6, trunkH, P.woodMid);
    c.line(trunkX + 1, H - trunkH - 4, trunkX + 1, H - 4, P.woodDark);
    c.line(trunkX + 5, H - trunkH - 4, trunkX + 5, H - 4, P.woodLight);
    c.ellipse(W / 2, H - trunkH - 16, W / 2 - 2, 18, P.leafDark);
    c.ellipse(W / 2 - 2, H - trunkH - 20, W / 2 - 6, 14, P.leafMid);
    c.ellipse(W / 2 - 4, H - trunkH - 24, W / 2 - 12, 10, P.leafLight);
    c.px(W / 2 - 8, H - trunkH - 22, lighten(P.leafLight, 0.4));
    c.px(W / 2 + 4, H - trunkH - 16, lighten(P.leafLight, 0.4));
}

function drawRock(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, W / 2 - 2, 3, P.shadow);
    c.ellipse(W / 2, H - 8, W / 2 - 3, H / 2 - 2, P.stoneMid);
    c.ellipse(W / 2 - 2, H - 10, W / 2 - 6, H / 2 - 4, P.stoneLight);
    c.ellipse(W / 2 + 3, H - 6, 3, 2, P.stoneShadow);
    c.px(W / 2 - 4, H - 12, lighten(P.stoneLight, 0.3));
}

function drawFlower(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.px(W / 2, H - 2, P.shadow);
    c.line(W / 2, H - 3, W / 2, H - 10, P.leafMid);
    c.px(W / 2 - 1, H - 7, P.leafLight);
    const petal = hex('#ffaacc');
    c.px(W / 2, H - 12, petal);
    c.px(W / 2 - 1, H - 13, petal);
    c.px(W / 2 + 1, H - 13, petal);
    c.px(W / 2, H - 14, petal);
    c.px(W / 2 - 2, H - 14, petal);
    c.px(W / 2 + 2, H - 14, petal);
    c.px(W / 2 - 1, H - 15, petal);
    c.px(W / 2 + 1, H - 15, petal);
    c.px(W / 2, H - 14, P.gold);
}

function drawTable(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, W / 2 - 4, 3, P.shadow);
    c.rect(6, H - 16, 4, 14, P.woodDark);
    c.rect(W - 10, H - 16, 4, 14, P.woodDark);
    c.rect(W / 2 - 12, H - 14, 4, 12, P.woodMid);
    c.rect(W / 2 + 8, H - 14, 4, 12, P.woodMid);
    c.ellipse(W / 2, H - 18, W / 2 - 2, 8, P.woodMid);
    c.ellipse(W / 2 - 2, H - 20, W / 2 - 4, 6, P.woodLight);
    for (let i = 0; i < 4; i++) c.line(8 + i * 12, H - 18, 16 + i * 12, H - 18, P.woodDark);
}

function drawSkillItem(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, 10, 2, P.shadow);
    c.rect(5, 8, 20, 18, P.burgundy);
    c.rect(5, 8, 20, 2, P.burgundyDark);
    c.rect(5, 24, 20, 2, P.burgundyDark);
    c.rect(5, 8, 3, 18, P.burgundyDark);
    c.rect(20, 14, 4, 6, P.gold);
    c.px(22, 17, P.goldDark);
    c.rect(8, 11, 16, 12, hex('#f0e3b8'));
    for (let i = 0; i < 4; i++) c.line(9, 14 + i * 2, 22, 14 + i * 2, hex('#c9b06a'));
    c.ellipse(W / 2, 6, 6, 2, [255, 230, 130, 80]);
}

function drawBookshelf(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, W / 2 - 4, 3, P.shadow);
    c.rect(2, 4, W - 4, H - 8, P.woodDark);
    c.rect(4, 6, W - 8, H - 12, P.woodMid);
    const shelves = 4;
    const shelfH = Math.floor((H - 14) / shelves);
    const palette = [
        P.burgundy,
        hex('#3a5aa0'),
        hex('#3a8a3a'),
        hex('#c97a2a'),
        hex('#5a3a7a'),
        hex('#2a5a6a'),
    ];
    for (let s = 0; s < shelves; s++) {
        const y = 8 + s * shelfH;
        let x = 8;
        while (x < W - 10) {
            const bw = 4 + ((x * 7 + s * 3) % 5);
            const bh = shelfH - 4 - ((x * 3) % 3);
            const col = palette[(x + s) % palette.length];
            const top = y + (shelfH - 4 - bh);
            c.rect(x, top, bw, bh, col);
            c.line(x, top, x + bw - 1, top, darken(col, 0.4));
            c.px(x + 1, top + 1, P.gold);
            x += bw + 1;
        }
        c.rect(4, y + shelfH - 4, W - 8, 2, P.woodDark);
    }
}

function drawRug(c: Canvas): void {
    const W = c.w,
        H = c.h;
    // Square rectangular rug — muted brown/grey weave, restrained pattern.
    const m = 4; // outer margin
    const base = hex('#6b5848'); // dusty brown
    const border = hex('#4a3c30'); // darker outline
    const inner = hex('#7a6856'); // slightly lighter inner field
    const accent = hex('#a89274'); // pale tan for trim
    const center = hex('#8a7560'); // muted highlight

    // Faint ground shadow
    c.rect(m + 2, H - 3, W - (m + 2) * 2, 2, P.shadow);

    // Base
    c.rect(m, m, W - m * 2, H - m * 2, base);
    // Outer dark frame
    c.outline(m, m, W - m * 2, H - m * 2, border);
    c.outline(m + 1, m + 1, W - m * 2 - 2, H - m * 2 - 2, border);
    // Inner field
    c.rect(m + 6, m + 6, W - (m + 6) * 2, H - (m + 6) * 2, inner);
    // Inner trim line
    c.outline(m + 6, m + 6, W - (m + 6) * 2, H - (m + 6) * 2, accent);

    // Center diamond (subtle)
    const cx = W / 2,
        cy = H / 2;
    const dx = Math.floor((W - (m + 6) * 2) / 4);
    const dy = Math.floor((H - (m + 6) * 2) / 4);
    c.tri(cx, cy - dy, cx + dx, cy, cx, cy + dy, center);
    c.tri(cx, cy - dy, cx - dx, cy, cx, cy + dy, center);
    c.outline(cx - dx, cy - dy, dx * 2, dy * 2, accent);
    c.px(cx, cy, border);

    // Short fringe along top and bottom edges (subtle, not gold)
    for (let x = m + 2; x < W - m - 2; x += 3) {
        c.px(x, m - 1, accent);
        c.px(x, H - m, accent);
    }
}

function drawLamp(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, 5, 2, P.shadow);
    c.rect(W / 2 - 4, H - 6, 8, 4, P.steelDark);
    c.rect(W / 2 - 3, H - 7, 6, 1, P.steel);
    c.rect(W / 2 - 1, 12, 2, H - 18, P.steelDark);
    c.line(W / 2, 12, W / 2 + 4, 8, P.steelDark);
    c.rect(W / 2 - 4, 4, 8, 8, P.steelDark);
    c.rect(W / 2 - 3, 5, 6, 6, P.gold);
    c.px(W / 2, 6, P.window);
    c.px(W / 2 - 1, 7, P.window);
    c.px(W / 2 + 1, 8, P.window);
    c.ellipse(W / 2, 7, 6, 4, [255, 220, 120, 50]);
}

function drawPlant(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, W / 2 - 4, 2, P.shadow);
    c.rect(W / 2 - 8, H - 14, 16, 12, P.terracotta);
    c.rect(W / 2 - 9, H - 14, 18, 2, P.terracottaDark);
    c.line(W / 2 - 7, H - 13, W / 2 - 7, H - 4, darken(P.terracotta, 0.3));
    c.line(W / 2 + 7, H - 13, W / 2 + 7, H - 4, lighten(P.terracotta, 0.15));
    for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.35;
        const len = 14 + (i % 2) * 4;
        const x0 = W / 2,
            y0 = H - 14;
        const x1 = x0 + Math.cos(a) * len;
        const y1 = y0 + Math.sin(a) * len;
        c.line(x0, y0, x1, y1, i % 2 === 0 ? P.leafMid : P.leafDark);
        c.line(x0 + 1, y0, x1 + 1, y1, P.leafLight);
        c.ellipse(x1, y1, 2, 2, P.leafLight);
    }
}

function drawCrate(c: Canvas): void {
    const W = c.w,
        H = c.h;
    c.ellipse(W / 2, H - 2, W / 2 - 4, 2, P.shadow);
    c.rect(3, 4, W - 6, H - 8, P.woodMid);
    c.outline(3, 4, W - 6, H - 8, P.woodBlack);
    c.rect(3, 4, W - 6, 4, P.woodLight);
    c.line(3, 8, W - 4, 8, P.woodBlack);
    c.line(4, 9, W - 5, H - 6, P.woodLight);
    c.line(W - 5, 9, 4, H - 6, P.woodLight);
    c.line(3, 16, W - 4, 16, P.woodBlack);
    c.line(W / 2, 8, W / 2, H - 5, P.woodDark);
    c.px(5, 6, P.steel);
    c.px(W - 6, 6, P.steel);
    c.px(5, H - 6, P.steel);
    c.px(W - 6, H - 6, P.steel);
}
