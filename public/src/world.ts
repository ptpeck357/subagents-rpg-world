import type {
    Agent,
    Building,
    Decoration,
    DoorPlacement,
    Interior,
    Npc,
    Rect,
    Skill,
    SkillItem,
    SpriteEntry,
    Table,
} from './types';

// ---------- constants ----------
export const TILE = 64;
export const MAP_W = 28;
export const MAP_H = 18;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;
export const PLAYER_SPEED = 220;
export const PLAYER_RUN = 380;
export const ZOOM = 1.6;

// ---------- sprite table ----------
// Drop PNG into /public/sprites/<key>.png to replace placeholder.
// Each sprite is anchored at bottom-center for painter's-algorithm draw.
export const sprites: Record<string, SpriteEntry> = {};

export function defineSprite(
    key: string,
    w: number,
    h: number,
    fallbackColor: string,
    label: string | null,
): SpriteEntry {
    const entry: SpriteEntry = {
        key,
        w,
        h,
        fallbackColor,
        label,
        ready: false,
        missing: false,
        img: null,
    };
    const img = new Image();
    img.onload = () => {
        entry.ready = true;
        entry.img = img;
    };
    img.onerror = () => {
        entry.missing = true;
    };
    img.src = `/sprites/${key}.png`;
    sprites[key] = entry;
    return entry;
}

defineSprite('building_api', 180, 140, '#9bb6d4', 'API');
defineSprite('building_architecture', 180, 140, '#a695d4', 'ARCH');
defineSprite('building_database', 180, 150, '#c4956b', 'DATABASE');
defineSprite('building_nextjs', 180, 140, '#2a2a2a', 'NEXT.JS');
defineSprite('building_payments', 180, 140, '#7bb87b', 'PAYMENTS');
defineSprite('building_react', 180, 140, '#61dafb', 'REACT');
defineSprite('building_ui', 180, 140, '#e89bd4', 'UI');
defineSprite('building_skills', 160, 120, '#d4c069', 'SKILL HUT');
defineSprite('npc_default', 28, 44, '#cc4444', null);
defineSprite('player', 32, 48, '#3366cc', 'you');
defineSprite('player_n', 32, 48, '#3366cc', null);
defineSprite('player_e', 32, 48, '#3366cc', null);
defineSprite('player_w', 32, 48, '#3366cc', null);
defineSprite('tree', 52, 72, '#2f6b2f', 'tree');
defineSprite('rock', 30, 24, '#777777', null);
defineSprite('flower', 14, 18, '#ffaacc', null);
defineSprite('table', 56, 34, '#6b4423', 'table');
defineSprite('skill_item', 30, 30, '#ffd966', null);
defineSprite('bookshelf', 120, 80, '#5b3a1d', 'books');
defineSprite('rug', 140, 90, '#8a3a2a', null);
defineSprite('lamp', 18, 44, '#ffd966', null);
defineSprite('plant', 30, 46, '#3a7a3a', null);
defineSprite('crate', 36, 32, '#7a5230', null);

// ---------- tilemap ----------
// 0=grass, 1=dark grass, 2=path, 3=plaza, 4=water, 5=sand
const map = new Uint8Array(MAP_W * MAP_H);

export function tileAt(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return map[ty * MAP_W + tx];
}

function setTile(tx: number, ty: number, v: number): void {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    map[ty * MAP_W + tx] = v;
}

function rand(seed: number): number {
    const x = (seed * 9301 + 49297) % 233280;
    return x / 233280;
}

function generateMap(plazaPxX: number, plazaPxY: number): void {
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            setTile(x, y, rand(x * 91 + y * 53) < 0.18 ? 1 : 0);
        }
    }
    const cx = plazaPxX / TILE,
        cy = plazaPxY / TILE;
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            if (Math.hypot(x - cx, y - cy) < 2.2) setTile(x, y, 3);
        }
    }
}

function bakeTileLayer(): HTMLCanvasElement {
    const off = document.createElement('canvas');
    off.width = WORLD_W;
    off.height = WORLD_H;
    const o = off.getContext('2d') as CanvasRenderingContext2D;
    const colors = ['#5fa84a', '#4f9a3c', '#b59766', '#c9b58f', '#3a7fb8', '#dfc99b'];
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            const t = tileAt(x, y);
            o.fillStyle = colors[t];
            o.fillRect(x * TILE, y * TILE, TILE, TILE);
            if (t === 0 || t === 1) {
                o.fillStyle = 'rgba(0,0,0,0.05)';
                const seed = x * 17 + y * 7;
                for (let s = 0; s < 3; s++) {
                    const px = x * TILE + rand(seed + s) * TILE;
                    const py = y * TILE + rand(seed + s + 99) * TILE;
                    o.fillRect(px, py, 2, 2);
                }
            }
        }
    }
    return off;
}

function paintPathTile(tx: number, ty: number): void {
    const t = tileAt(tx, ty);
    if (t === 3) return; // don't overwrite plaza
    setTile(tx, ty, 2);
}

function paintPath(x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1,
        dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 2)));
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        const tx = Math.floor(px / TILE);
        const ty = Math.floor(py / TILE);
        paintPathTile(tx, ty);
        if (Math.abs(dx) > Math.abs(dy)) paintPathTile(tx, ty + 1);
        else paintPathTile(tx + 1, ty);
    }
}

// ---------- world entities (populated by layoutWorld) ----------
export const buildings: Building[] = [];
export const decorations: Decoration[] = [];
const obstacles: Rect[] = [];

export let tileLayer: HTMLCanvasElement = null as unknown as HTMLCanvasElement;

// ---------- interior builder ----------
function buildInterior(name: string, agents: Agent[] | null, skills: Skill[] | null): Interior {
    const groups: Record<string, Agent[]> = {};
    for (const a of agents || []) (groups[a.subcategory || '_main'] ||= []).push(a);
    const subKeys = Object.keys(groups);
    const isSkillHut = !!skills;

    const cols = isSkillHut ? skills!.length : Math.max(1, subKeys.length);
    const width = Math.max(560, 220 + cols * 220);
    const height = 460;
    const tables: Table[] = [];
    const items: SkillItem[] = [];
    const npcs: Npc[] = [];
    const decor: Decoration[] = [];
    const solids: Rect[] = [];

    function npcsAround(arr: Agent[], tx: number, ty: number, rx: number, ry: number): void {
        arr.forEach((agent, i) => {
            const ang = (i / Math.max(1, arr.length)) * Math.PI * 2;
            npcs.push({
                agent,
                home: { x: tx + Math.cos(ang) * rx, y: ty + Math.sin(ang) * ry },
                x: 0,
                y: 0,
                seed: (Math.sin(i * 73 + tx * 0.13) + 1) * Math.PI,
            });
        });
    }

    if (isSkillHut) {
        // Back-wall bookshelves, feet at y=110 (shelf top reaches up into the wall band).
        const shelfY = 110;
        const shelfW = 120;
        const usable = width - 80;
        const shelfCount = Math.max(1, Math.round(usable / shelfW));
        const slot = usable / shelfCount;
        for (let i = 0; i < shelfCount; i++) {
            const sx = 40 + (i + 0.5) * slot;
            decor.push({ sprite: 'bookshelf', x: sx, y: shelfY });
            solids.push({ x: sx - 50, y: shelfY - 60, w: 100, h: 50 });
        }
        skills!.forEach((s, i) => {
            const tx = ((i + 1) / (skills!.length + 1)) * width;
            const ty = shelfY + 40;
            items.push({ skill: s, x: tx, y: ty });
        });
        decor.push({ sprite: 'plant', x: 50, y: height - 50 });
        decor.push({ sprite: 'plant', x: width - 50, y: height - 50 });
        decor.push({ sprite: 'crate', x: 60, y: height - 130 });
        decor.push({ sprite: 'crate', x: width - 60, y: height - 130 });
        solids.push({ x: 38, y: height - 80, w: 26, h: 26 });
        solids.push({ x: width - 64, y: height - 80, w: 26, h: 26 });
    } else if (subKeys.length === 1 && subKeys[0] === '_main') {
        const tx = width / 2,
            ty = height / 2 - 20;
        tables.push({ name: null, x: tx, y: ty });
        npcsAround(groups._main, tx, ty + 10, 130, 90);
        decor.push({ sprite: 'lamp', x: tx - 50, y: ty - 4 });
        decor.push({ sprite: 'lamp', x: tx + 50, y: ty - 4 });
        decor.push({ sprite: 'plant', x: 50, y: 90 });
        decor.push({ sprite: 'plant', x: width - 50, y: 90 });
        decor.push({ sprite: 'plant', x: 50, y: height - 50 });
        decor.push({ sprite: 'plant', x: width - 50, y: height - 50 });
        decor.push({ sprite: 'crate', x: width - 60, y: height - 130 });
        solids.push({ x: width - 78, y: height - 162, w: 36, h: 32 });
    } else {
        subKeys.forEach((sub, i) => {
            const tx = ((i + 1) / (subKeys.length + 1)) * width;
            const ty = height / 2 - 20;
            tables.push({ name: sub, x: tx, y: ty });
            npcsAround(groups[sub], tx, ty + 10, 90, 65);
            decor.push({ sprite: 'lamp', x: tx, y: ty - 4 });
        });
        decor.push({ sprite: 'plant', x: 50, y: 90 });
        decor.push({ sprite: 'plant', x: width - 50, y: 90 });
        decor.push({ sprite: 'crate', x: 60, y: height - 60 });
        decor.push({ sprite: 'crate', x: width - 60, y: height - 60 });
        solids.push({ x: 42, y: height - 92, w: 36, h: 32 });
        solids.push({ x: width - 78, y: height - 92, w: 36, h: 32 });
    }

    return {
        name,
        width,
        height,
        tables,
        items,
        npcs,
        decor,
        solids,
        exitDoor: { x: width / 2, y: height - 18, w: 56, h: 18 },
    };
}

function placeBuilding(
    category: string,
    x: number,
    y: number,
    agents: Agent[],
    placement: DoorPlacement,
): void {
    const sprite = sprites[`building_${category}`] ?? sprites.building_api;
    const w = sprite.w,
        h = sprite.h;
    buildings.push({
        x,
        y,
        w,
        h,
        sprite: `building_${category}`,
        name: category,
        door: placement.door,
        exitOffset: placement.exitOffset,
        exitFacing: placement.exitFacing,
        interior: buildInterior(category, agents, null),
    });
    obstacles.push({ x: x - w / 2, y: y - h, w, h });
}

function placeSkillHut(x: number, y: number, skills: Skill[], placement: DoorPlacement): void {
    const sprite = sprites.building_skills;
    const w = sprite.w,
        h = sprite.h;
    buildings.push({
        x,
        y,
        w,
        h,
        sprite: 'building_skills',
        name: 'Skill Hut',
        door: placement.door,
        exitOffset: placement.exitOffset,
        exitFacing: placement.exitFacing,
        interior: buildInterior('Skill Hut', null, skills),
    });
    obstacles.push({ x: x - w / 2, y: y - h, w, h });
}

function isOpenGround(x: number, y: number, pad: number): boolean {
    const tx = Math.floor(x / TILE),
        ty = Math.floor(y / TILE);
    const t = tileAt(tx, ty);
    if (t === 3 || t === 4 || t === 2) return false;
    for (const o of obstacles) {
        if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad)
            return false;
    }
    for (const d of decorations) {
        if (Math.hypot(x - d.x, y - d.y) < pad) return false;
    }
    return true;
}

function scatterDecorations(): void {
    // Jittered grid: one prop attempt per cell across the whole map.
    const cols = 8,
        rows = 5;
    const cw = WORLD_W / cols,
        ch = WORLD_H / rows;
    for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
            const i = cy * cols + cx;
            const px = cx * cw + 30 + rand(i * 31 + 1) * (cw - 60);
            const py = cy * ch + 30 + rand(i * 41 + 7) * (ch - 60);
            if (!isOpenGround(px, py, 40)) continue;
            let nearDoor = false;
            for (const b of buildings) {
                if (Math.hypot(px - b.door.x, py - b.door.y) < 90) {
                    nearDoor = true;
                    break;
                }
            }
            if (nearDoor) continue;
            const roll = rand(i * 19 + 3);
            if (roll < 0.3) {
                decorations.push({ sprite: 'tree', x: px, y: py });
                obstacles.push({ x: px - 18, y: py - 12, w: 36, h: 18 });
            } else if (roll < 0.65) {
                decorations.push({ sprite: 'rock', x: px, y: py });
            } else {
                decorations.push({ sprite: 'flower', x: px, y: py });
            }
        }
    }
}

// Row-and-street layout: all buildings sit in a single row near the top of the
// map, doors pointing south at the plaza below. A horizontal "main street" tile
// strip runs between the buildings and the plaza, so each building's south door
// connects to it via a short stub path, then the plaza connects to the main
// street via one vertical artery. This keeps painted doors, entry rects, and
// dirt paths visually consistent for every building.
//
// The painted door in the sprite isn't sprite-centered — it sits inside the
// front face which itself is offset left of the anchor (because the side recede
// occupies the right portion). `southDoor` mirrors that offset so the entry
// rect lands underneath the visible door.
function southDoor(bx: number, by: number, spriteW: number): DoorPlacement {
    // Matches the door placement in scripts/sprite/buildings.ts:drawDoor —
    // doorCenterLocal = 4 + floor(spriteW * 0.72 / 2). Offset from anchor:
    const doorOffsetX = 4 + Math.floor((spriteW * 0.72) / 2) - spriteW / 2;
    return {
        door: { x: bx + doorOffsetX, y: by - 4, w: 44, h: 18 },
        exitOffset: { x: 0, y: 28 },
        exitFacing: 'south',
    };
}

export function layoutWorld(
    categories: string[],
    byCategory: Record<string, Agent[]>,
    skillsRes: Skill[],
): void {
    const total = categories.length + 1; // +1 for skill hut
    const buildingRowY = Math.floor(WORLD_H * 0.28);
    const streetY = Math.floor(WORLD_H * 0.55);
    const wcx = WORLD_W / 2;
    const plazaY = Math.floor(WORLD_H * 0.78);

    generateMap(wcx, plazaY);

    // Distribute buildings evenly across the world width.
    const xPositions: number[] = [];
    for (let i = 0; i < total; i++) {
        xPositions.push(Math.floor(WORLD_W * ((i + 0.5) / total)));
    }

    type Slot = {
        kind: 'building' | 'skill';
        cat: string;
        x: number;
        y: number;
        placement: DoorPlacement;
    };
    const slots: Slot[] = [];
    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const bx = xPositions[i];
        const by = buildingRowY;
        const sprite = sprites[`building_${cat}`] ?? sprites.building_api;
        slots.push({
            kind: 'building',
            cat,
            x: bx,
            y: by,
            placement: southDoor(bx, by, sprite.w),
        });
    }
    const sbx = xPositions[categories.length];
    const sby = buildingRowY;
    slots.push({
        kind: 'skill',
        cat: 'skills',
        x: sbx,
        y: sby,
        placement: southDoor(sbx, sby, sprites.building_skills.w),
    });

    // Paint paths: stub from each door south to the main street, then a horizontal
    // street across all stubs, then a vertical artery from the street to the plaza.
    const streetMinX = Math.min(...slots.map((s) => s.placement.door.x));
    const streetMaxX = Math.max(...slots.map((s) => s.placement.door.x));
    paintPath(streetMinX, streetY, streetMaxX, streetY);
    for (const s of slots) {
        paintPath(s.placement.door.x, s.placement.door.y, s.placement.door.x, streetY);
    }
    paintPath(wcx, streetY, wcx, plazaY);

    tileLayer = bakeTileLayer();

    for (const s of slots) {
        if (s.kind === 'building') placeBuilding(s.cat, s.x, s.y, byCategory[s.cat], s.placement);
        else placeSkillHut(s.x, s.y, skillsRes, s.placement);
    }
    scatterDecorations();
}

// ---------- collision ----------
export function blockedVillage(px: number, py: number): boolean {
    const r = 10;
    for (const o of obstacles) {
        if (px + r > o.x && px - r < o.x + o.w && py + r > o.y && py - r < o.y + o.h) return true;
    }
    const t = tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
    if (t === 4) return true;
    if (px < 16 || py < 16 || px > WORLD_W - 16 || py > WORLD_H - 16) return true;
    return false;
}

export function blockedInterior(room: Interior, px: number, py: number): boolean {
    const r = 10,
        pad = 18;
    if (px < pad || py < pad || px > room.width - pad || py > room.height - pad) return true;
    for (const t of room.tables) {
        if (px + r > t.x - 32 && px - r < t.x + 32 && py + r > t.y - 20 && py - r < t.y + 20)
            return true;
    }
    for (const s of room.solids) {
        if (px + r > s.x && px - r < s.x + s.w && py + r > s.y && py - r < s.y + s.h) return true;
    }
    return false;
}

export function rectContains(rect: Rect, px: number, py: number): boolean {
    return (
        px > rect.x - rect.w / 2 &&
        px < rect.x + rect.w / 2 &&
        py > rect.y - rect.h / 2 &&
        py < rect.y + rect.h / 2
    );
}
