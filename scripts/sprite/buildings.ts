// 3/4 oblique building renderer + data-driven style/feature/emblem tables.
//
// Each building entry in `buildingSpecs` picks one style (palette of wall,
// shade, shadow, trim, door), an optional emblem (above door), optional roof
// prop (dish, atom), and an optional structural feature (columns, clay-dome
// roof, thatched roof). `drawBuilding()` interprets the spec.

import { Canvas, darken, hex, lighten, type RGBA } from './canvas';
import { P } from './palette';

export type RoofKind = 'peaked' | 'clay' | 'thatched';

export type BuildingStyle = {
    wall: RGBA;
    shade: RGBA;
    shadow: RGBA;
    trim: RGBA;
    door: RGBA;
};

export const STYLES: Record<string, BuildingStyle> = {
    stone: {
        wall: P.stoneMid,
        shade: P.stoneLight,
        shadow: darken(P.stoneMid, 0.35),
        trim: P.stoneShadow,
        door: P.woodMid,
    },
    stoneLight: {
        wall: P.stoneLight,
        shade: P.stoneMid,
        shadow: darken(P.stoneLight, 0.4),
        trim: P.stoneShadow,
        door: P.woodMid,
    },
    wood: {
        wall: P.woodLight,
        shade: P.woodMid,
        shadow: P.woodDark,
        trim: P.woodBlack,
        door: P.woodBlack,
    },
    clay: {
        wall: hex('#b89065'),
        shade: hex('#8a6440'),
        shadow: hex('#6b4f30'),
        trim: P.woodDark,
        door: P.woodDark,
    },
    dark: {
        wall: hex('#2c2c2c'),
        shade: hex('#1a1a1a'),
        shadow: hex('#0d0d0d'),
        trim: hex('#f0f0f0'),
        door: hex('#0a0a0a'),
    },
};

// ---------- emblems (above door) ----------

const EMBLEMS: Record<string, (c: Canvas, x: number, y: number) => void> = {
    coin: (c, x, y) => {
        c.ellipse(x, y, 6, 6, P.gold);
        c.ellipse(x, y, 4, 4, P.goldDark);
        c.px(x - 1, y - 1, P.gold);
    },
    rose: (c, x, y) => {
        c.ellipse(x, y, 7, 7, P.stoneLight);
        c.ellipse(x, y, 5, 5, P.stoneShadow);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            c.px(x + Math.cos(a) * 4, y + Math.sin(a) * 4, P.window);
        }
        c.px(x, y, P.gold);
    },
};

const ROOF_PROPS: Record<string, (c: Canvas, x: number, y: number) => void> = {
    dish: (c, x, y) => {
        c.line(x, y, x, y + 8, P.steelDark);
        c.ellipse(x, y, 6, 3, P.steel);
        c.ellipse(x, y + 1, 5, 2, P.steelDark);
        c.px(x + 2, y - 2, P.steel);
    },
    atom: (c, x, y) => {
        c.ellipse(x, y + 4, 7, 3, hex('#61dafb'));
        c.ellipse(x, y + 4, 3, 7, hex('#61dafb'));
        c.ellipse(x, y + 4, 5, 5, [0, 0, 0, 0]);
        c.px(x, y + 4, hex('#1d8db8'));
    },
};

export type BuildingSpec = {
    size?: { w: number; h: number };
    roof: string; // hex
    style: keyof typeof STYLES;
    emblem?: keyof typeof EMBLEMS;
    roofProp?: keyof typeof ROOF_PROPS;
    roofKind?: RoofKind; // defaults to 'peaked'
    columns?: boolean;
    silo?: boolean; // tall metal cylinder attached to back-right (database)
};

// Atlas of every building. `size` defaults to 180×140; database is taller (150),
// skill hut is smaller (160×120). Adding a building = adding one line here +
// optionally one defineSprite() in public/src/world.ts.
export const buildingSpecs: Record<string, BuildingSpec> = {
    api: { roof: '#5d7a99', style: 'stone', roofProp: 'dish' },
    architecture: { roof: '#7a6aa3', style: 'stoneLight', columns: true },
    database: { size: { w: 180, h: 150 }, roof: '#a86d3d', style: 'clay', silo: true },
    nextjs: { roof: '#1a1a1a', style: 'dark' },
    payments: { roof: '#4f8a3a', style: 'stone', emblem: 'coin' },
    react: { roof: '#3aa0c8', style: 'wood', roofProp: 'atom' },
    ui: { roof: '#c970a8', style: 'stoneLight', emblem: 'rose' },
    skills: { size: { w: 160, h: 120 }, roof: '#a8893a', style: 'wood', roofKind: 'thatched' },
};

export function drawBuilding(c: Canvas, spec: BuildingSpec): void {
    const W = c.w,
        H = c.h;
    const roof = hex(spec.roof);
    const style = STYLES[spec.style];
    const kind = spec.roofKind ?? 'peaked';

    const roofH = Math.floor(H * 0.38);
    const wallTop = roofH;
    const wallBot = H - 4;
    const fx = 4;
    const fw = Math.floor(W * 0.72);
    const sideDepth = Math.floor(W * 0.22);
    const skew = Math.floor(roofH * 0.55);

    // Ground shadow
    c.ellipse(W / 2, H - 2, W / 2 - 6, 4, P.shadow);

    drawSideWall(c, fx + fw, sideDepth, wallTop, wallBot, skew, style.shadow);
    drawFrontWall(c, fx, wallTop, fw, wallBot, style);
    if (spec.columns) drawColumns(c, fx, wallTop, fw, wallBot);
    const door = drawDoor(c, fx, fw, wallTop, wallBot, style);
    drawWindows(c, fx, fw, wallTop, style.trim);
    if (spec.emblem) EMBLEMS[spec.emblem](c, fx + fw / 2, wallTop + 8);

    if (kind === 'clay') drawClayRoof(c, fx, fw, wallTop, sideDepth, skew, roof);
    else if (kind === 'thatched') drawThatchedRoof(c, fx, fw, wallTop, sideDepth, skew, roof);
    else drawPeakedRoof(c, fx, fw, wallTop, sideDepth, skew, roof);

    if (spec.roofProp) ROOF_PROPS[spec.roofProp](c, fx + fw / 2, Math.max(4, wallTop - roofH + 6));

    // Silo tower on the back-right (data-server vibe). Drawn after the roof so it
    // visually rises above the building.
    if (spec.silo) {
        const siloCx = fx + fw + sideDepth - 16;
        drawSilo(c, siloCx, wallBot, 14);
    }

    // Wall outline (last so it sits on top)
    c.line(fx, wallTop, fx, wallBot, P.stoneShadow);
    c.line(fx + fw, wallTop, fx + fw, wallBot, P.stoneShadow);
    c.line(fx + fw + sideDepth, wallTop - skew, fx + fw + sideDepth, wallBot - skew, P.stoneShadow);
    c.line(fx + fw, wallBot, fx + fw + sideDepth, wallBot - skew, P.stoneShadow);
    // Suppress unused-param warning until we wire door details into render
    void door;
}

function drawSideWall(
    c: Canvas,
    x0: number,
    sideDepth: number,
    wallTop: number,
    wallBot: number,
    skew: number,
    shadowColor: RGBA,
): void {
    const yTopFront = wallTop;
    const yTopBack = wallTop - skew;
    const yBotFront = wallBot;
    const yBotBack = wallBot - skew;
    for (let y = Math.min(yTopBack, yTopFront); y <= Math.max(yBotFront, yBotBack); y++) {
        for (let i = 0; i < sideDepth; i++) {
            const t = i / sideDepth;
            const topAtX = yTopFront + (yTopBack - yTopFront) * t;
            const botAtX = yBotFront + (yBotBack - yBotFront) * t;
            if (y >= topAtX && y <= botAtX) c.px(x0 + i, y, shadowColor);
        }
    }
    for (let i = 0; i < sideDepth; i += 2) {
        const t = i / sideDepth;
        const topAtX = yTopFront + (yTopBack - yTopFront) * t;
        const botAtX = yBotFront + (yBotBack - yBotFront) * t;
        for (let y = Math.ceil(topAtX); y < botAtX; y += 2) {
            c.px(x0 + i, y, darken(shadowColor, 0.25));
        }
    }
}

function drawFrontWall(
    c: Canvas,
    fx: number,
    wallTop: number,
    fw: number,
    wallBot: number,
    style: BuildingStyle,
): void {
    c.rect(fx, wallTop, fw, wallBot - wallTop, style.wall);
    c.dither(fx + 2, wallTop + 2, fw - 4, wallBot - wallTop - 4, style.shade);
    // Horizontal mortar lines
    for (let y = wallTop + 12; y < wallBot - 4; y += 14) {
        for (let x = fx + 3; x < fx + fw - 3; x++) {
            if (((x + y) & 7) !== 0) c.px(x, y, darken(style.wall, 0.35));
        }
    }
    // Vertical mortar (staggered between rows)
    for (let y = wallTop + 6; y < wallBot - 4; y += 14) {
        const offset = ((y / 14) | 0) % 2 === 0 ? 0 : 18;
        for (let x = fx + 12 + offset; x < fx + fw - 6; x += 36) {
            for (let yy = y; yy < y + 14 && yy < wallBot - 4; yy++) {
                c.px(x, yy, darken(style.wall, 0.35));
            }
        }
    }
    // Foundation band
    c.rect(fx, wallBot - 6, fw, 6, darken(style.wall, 0.45));
}

function drawColumns(c: Canvas, fx: number, wallTop: number, fw: number, wallBot: number): void {
    for (let i = 0; i < 4; i++) {
        const cx = fx + 18 + i * Math.floor((fw - 36) / 3);
        c.rect(cx, wallTop + 4, 6, wallBot - wallTop - 10, P.stoneLight);
        c.rect(cx - 1, wallTop + 2, 8, 4, P.stoneLight);
        c.rect(cx - 1, wallBot - 10, 8, 4, P.stoneLight);
        c.outline(cx, wallTop + 4, 6, wallBot - wallTop - 10, darken(P.stoneLight, 0.4));
    }
}

function drawDoor(
    c: Canvas,
    fx: number,
    fw: number,
    wallTop: number,
    wallBot: number,
    style: BuildingStyle,
): { x: number; y: number; w: number; h: number } {
    const doorW = 24,
        doorH = 36;
    const doorX = fx + Math.floor(fw / 2) - Math.floor(doorW / 2);
    const doorY = wallBot - doorH - 6;
    c.ellipse(doorX + doorW / 2 - 0.5, doorY + 6, doorW / 2, 8, style.door);
    c.rect(doorX, doorY + 6, doorW, doorH - 6, style.door);
    c.outline(doorX - 2, doorY - 2, doorW + 4, doorH + 4, style.trim);
    c.ellipse(doorX + doorW / 2 - 0.5, doorY + 6, doorW / 2 + 2, 10, style.trim);
    c.ellipse(doorX + doorW / 2 - 0.5, doorY + 6, doorW / 2, 8, style.door);
    c.rect(doorX, doorY + 6, doorW, doorH - 6, style.door);
    for (let i = 6; i < doorH; i += 4) {
        for (let x = 0; x < doorW; x++) c.px(doorX + x, doorY + i, darken(style.door, 0.4));
    }
    c.px(doorX + doorW - 5, doorY + doorH / 2 + 4, P.gold);
    c.px(doorX + doorW - 5, doorY + doorH / 2 + 5, P.goldDark);
    return { x: doorX, y: doorY, w: doorW, h: doorH };
}

function drawWindows(c: Canvas, fx: number, fw: number, wallTop: number, trim: RGBA): void {
    const winY = wallTop + 18,
        winW = 18,
        winH = 16;
    const leftX = fx + 14;
    const rightX = fx + fw - 14 - winW;
    for (const wx of [leftX, rightX]) {
        c.rect(wx, winY, winW, winH, P.glassDark);
        c.outline(wx - 1, winY - 1, winW + 2, winH + 2, trim);
        c.rect(wx + 1, winY + 1, winW - 2, winH - 2, P.window);
        c.line(wx + winW / 2, winY + 1, wx + winW / 2, winY + winH - 2, trim);
        c.line(wx + 1, winY + winH / 2, wx + winW - 2, winY + winH / 2, trim);
    }
}

function drawPeakedRoof(
    c: Canvas,
    fx: number,
    fw: number,
    wallTop: number,
    sideDepth: number,
    skew: number,
    roof: RGBA,
): void {
    const peakX = fx + fw / 2;
    const peakY = 2;
    const roofShadow = darken(roof, 0.35);
    c.tri(fx - 4, wallTop + 2, fx + fw + 4, wallTop + 2, peakX, peakY, roof);
    c.tri(
        fx + fw + 4,
        wallTop + 2,
        fx + fw + 4 + sideDepth,
        wallTop + 2 - skew,
        peakX,
        peakY,
        roofShadow,
    );
    for (let i = 1; i < 6; i++) {
        const yL = wallTop + 2 - i * 4;
        if (yL < peakY + 2) break;
        const ratio = i / 6;
        const xLeft = fx - 4 + ratio * (fw / 2 + 4);
        const xRight = fx + fw + 4 - ratio * (fw / 2 + 4);
        c.line(xLeft, yL, xRight, yL, darken(roof, 0.4));
    }
    c.line(fx - 4, wallTop + 2, peakX, peakY, darken(roof, 0.55));
    c.line(fx + fw + 4, wallTop + 2, peakX, peakY, darken(roof, 0.55));
    c.line(fx + fw + 4, wallTop + 2, fx + fw + 4 + sideDepth, wallTop + 2 - skew, P.stoneShadow);
}

function drawClayRoof(
    c: Canvas,
    fx: number,
    fw: number,
    wallTop: number,
    sideDepth: number,
    skew: number,
    roof: RGBA,
): void {
    const cx0 = fx + fw / 2;
    const baseY = wallTop + 2;
    const peakY = 4;
    const ry = baseY - peakY;
    const rx = fw / 2 + 4;
    // Front half-ellipse dome
    for (let y = peakY; y <= baseY; y++) {
        const dy = (y - baseY) / ry;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
        for (let x = Math.floor(cx0 - xspan); x <= Math.ceil(cx0 + xspan); x++) c.px(x, y, roof);
    }
    // Right-side gradient shadow
    for (let y = peakY + 2; y <= baseY; y++) {
        const dy = (y - baseY) / ry;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
        for (let x = Math.ceil(cx0 + xspan) - 5; x <= Math.ceil(cx0 + xspan); x++) {
            c.px(x, y, darken(roof, 0.3));
        }
    }
    // Recede triangle
    c.tri(
        fx + fw + 4,
        wallTop + 2,
        fx + fw + 4 + sideDepth,
        wallTop + 2 - Math.min(skew, ry - 4),
        cx0 + Math.floor(sideDepth * 0.4),
        peakY + 2,
        darken(roof, 0.4),
    );
    // Tile bands
    for (let i = 1; i <= 3; i++) {
        const yy = peakY + (i / 4) * ry;
        const dy = (yy - baseY) / ry;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx - 2;
        for (let x = Math.floor(cx0 - xspan); x <= Math.ceil(cx0 + xspan); x++) {
            c.px(x, yy, darken(roof, 0.5));
        }
    }
    // Finial
    c.rect(cx0 - 1, peakY - 3, 2, 4, P.steelDark);
    c.ellipse(cx0, peakY - 4, 2, 2, P.gold);
    // Rim outline (lower half traces the dome edge)
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.02) {
        const x = cx0 + Math.cos(a) * rx;
        const y = baseY + Math.sin(a) * ry;
        c.px(x, y, darken(roof, 0.6));
    }
}

function drawThatchedRoof(
    c: Canvas,
    fx: number,
    fw: number,
    wallTop: number,
    sideDepth: number,
    skew: number,
    roof: RGBA,
): void {
    const peakX = fx + fw / 2;
    const peakY = 2;
    c.tri(fx - 4, wallTop + 2, fx + fw + 4, wallTop + 2, peakX, peakY, roof);
    c.tri(
        fx + fw + 4,
        wallTop + 2,
        fx + fw + 4 + sideDepth,
        wallTop + 2 - skew,
        peakX,
        peakY,
        darken(roof, 0.3),
    );
    for (let layer = 0; layer < 7; layer++) {
        const yL = wallTop + 1 - layer * 4;
        if (yL < peakY + 1) break;
        const t = (wallTop + 2 - yL) / (wallTop + 2 - peakY);
        const halfW = (fw / 2 + 4) * (1 - t);
        for (let x = peakX - halfW; x <= peakX + halfW; x += 3) {
            c.px(x, yL, darken(roof, 0.5));
            c.px(x + 1, yL + 1, darken(roof, 0.2));
            c.px(x + 2, yL + 2, darken(roof, 0.55));
        }
    }
    c.line(peakX - 2, peakY + 1, peakX + 2, peakY + 1, darken(roof, 0.7));
    for (let x = fx - 4; x <= fx + fw + 4; x += 2) {
        c.px(x, wallTop + 3, darken(roof, 0.6));
        c.px(x + 1, wallTop + 4, darken(roof, 0.35));
    }
    c.line(fx - 4, wallTop + 2, peakX, peakY, darken(roof, 0.65));
    c.line(fx + fw + 4, wallTop + 2, peakX, peakY, darken(roof, 0.65));
    c.line(fx + fw + 4, wallTop + 2, fx + fw + 4 + sideDepth, wallTop + 2 - skew, P.stoneShadow);
}

// Tall steel cylinder with domed cap, banded rings, and a vent pipe. Attaches to
// the back-right of a building and rises above its roof.
function drawSilo(c: Canvas, cx: number, baseY: number, halfW: number): void {
    const body = P.steel;
    const shadow = P.steelDark;
    const topY = 4;
    const capH = halfW;
    const bodyTop = topY + capH;

    // Cap (top half-ellipse)
    for (let y = topY; y <= bodyTop; y++) {
        const dy = (y - bodyTop) / capH;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * halfW;
        for (let x = Math.floor(cx - xspan); x <= Math.ceil(cx + xspan); x++) c.px(x, y, body);
    }
    // Cap right-side shadow
    for (let y = topY + 2; y <= bodyTop; y++) {
        const dy = (y - bodyTop) / capH;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * halfW;
        const xR = Math.ceil(cx + xspan);
        for (let x = xR - 4; x <= xR; x++) c.px(x, y, shadow);
    }
    // Cap left highlight strip
    for (let y = topY + 2; y <= bodyTop - 2; y++) {
        const dy = (y - bodyTop) / capH;
        const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * halfW;
        c.px(Math.floor(cx - xspan) + 1, y, lighten(body, 0.25));
        c.px(Math.floor(cx - xspan) + 2, y, lighten(body, 0.15));
    }

    // Body
    c.rect(cx - halfW, bodyTop, halfW * 2, baseY - bodyTop, body);
    // Left highlight band
    c.rect(cx - halfW + 1, bodyTop, 3, baseY - bodyTop, lighten(body, 0.25));
    // Right shadow band
    c.rect(cx + halfW - 4, bodyTop, 3, baseY - bodyTop, shadow);

    // Three banding rings (data discs)
    const bodyH = baseY - bodyTop;
    for (let i = 1; i <= 3; i++) {
        const ringY = bodyTop + Math.floor((bodyH * i) / 4);
        c.rect(cx - halfW, ringY, halfW * 2, 3, darken(body, 0.5));
        c.rect(cx - halfW, ringY + 1, halfW * 2, 1, lighten(body, 0.2));
    }

    // Vent pipe + tip
    c.rect(cx - 2, topY - 4, 4, 5, shadow);
    c.rect(cx - 1, topY - 5, 2, 1, body);

    // Vertical outlines
    c.line(cx - halfW, bodyTop, cx - halfW, baseY, darken(body, 0.5));
    c.line(cx + halfW, bodyTop, cx + halfW, baseY, darken(body, 0.5));
    // Cap rim outline
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.03) {
        const x = cx + Math.cos(a) * halfW;
        const y = bodyTop + Math.sin(a) * halfW;
        c.px(x, y, darken(body, 0.55));
    }
    // Base shadow on ground
    c.ellipse(cx, baseY + 1, halfW, 2, P.shadow);
}
