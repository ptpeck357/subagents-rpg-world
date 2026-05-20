import type { Building, Npc, Player, SkillItem } from './types';
import { ZOOM, WORLD_W, WORLD_H, buildings, decorations, sprites, tileLayer } from './world';
import type { Facing } from './types';

function playerSpriteKey(facing: Facing): string {
    return facing === 'north'
        ? 'player_n'
        : facing === 'east'
          ? 'player_e'
          : facing === 'west'
            ? 'player_w'
            : 'player';
}

let canvas: HTMLCanvasElement = null as unknown as HTMLCanvasElement;
let ctx: CanvasRenderingContext2D = null as unknown as CanvasRenderingContext2D;
let nearbyEl: HTMLElement = null as unknown as HTMLElement;

export function setRenderContext(
    canvasEl: HTMLCanvasElement,
    ctxEl: CanvasRenderingContext2D,
    nearby: HTMLElement,
): void {
    canvas = canvasEl;
    ctx = ctxEl;
    nearbyEl = nearby;
}

// Tracked nearest NPC / skill in interior; updated each frame by renderInterior.
export let currentNearest: Npc | null = null;
export let currentNearestSkill: SkillItem | null = null;

function drawSprite(key: string, x: number, y: number, scale = 1): void {
    const s = sprites[key];
    if (!s) return;
    const w = s.w * scale,
        h = s.h * scale;
    const dx = Math.round(x - w / 2),
        dy = Math.round(y - h);
    if (s.ready && s.img) {
        ctx.drawImage(s.img, dx, dy, w, h);
    } else {
        ctx.fillStyle = s.fallbackColor;
        ctx.fillRect(dx, dy, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(dx, dy + h - 6, w, 6);
        if (s.label) {
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(10, h * 0.12)}px ui-sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.label, dx + w / 2, dy + h / 2);
        }
    }
}

function drawBuildingSign(b: Building): void {
    const name = b.name.toUpperCase();
    ctx.font = 'bold 9px ui-sans-serif';
    const textW = Math.ceil(ctx.measureText(name).width);
    const padX = 5,
        padY = 2;
    const signW = textW + padX * 2;
    const signH = 9 + padY * 2;
    // Sit the sign on the wall just below the roof eave (above the windows).
    // Door x already accounts for the sprite's painted-door offset.
    const signX = Math.round(b.door.x - signW / 2);
    const signY = Math.round(b.y - b.h * 0.62 + 2);
    ctx.fillStyle = '#3a2616'; // dark wood
    ctx.fillRect(signX, signY, signW, signH);
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(signX, signY, signW, 1);
    ctx.fillRect(signX, signY + signH - 1, signW, 1);
    ctx.fillStyle = '#ffd966'; // warm gold text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, b.door.x, signY + signH / 2 + 0.5);
}

function drawNpcLabel(npc: Npc, highlighted: boolean): void {
    const text = npc.agent.name;
    ctx.font = highlighted ? 'bold 11px ui-sans-serif' : '10px ui-sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    ctx.fillStyle = highlighted ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(npc.x - w / 2, npc.y - 72, w, 16);
    ctx.fillStyle = highlighted ? '#ffd966' : 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, npc.x, npc.y - 64);
}

function drawSkillItemLabel(item: SkillItem): void {
    ctx.font = '11px ui-sans-serif';
    const w = Math.ceil(ctx.measureText(item.skill.name).width) + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(item.x - w / 2, item.y - 56, w, 16);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.skill.name, item.x, item.y - 48);
}

function drawInteriorRoom(room: Building['interior']): void {
    const plankH = 32;
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(0, 0, room.width, room.height);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < room.height; y += plankH) {
        ctx.fillRect(0, y, room.width, 2);
    }
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, room.width, 24);
    ctx.fillRect(0, 0, 14, room.height);
    ctx.fillRect(room.width - 14, 0, 14, room.height);
    ctx.fillRect(0, room.height - 14, room.width, 14);
    const d = room.exitDoor;
    ctx.fillStyle = '#c9b58f';
    ctx.fillRect(d.x - d.w / 2, room.height - 14, d.w, 14);
    ctx.fillStyle = 'rgba(255, 217, 102, 0.22)';
    ctx.fillRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name.toUpperCase(), room.width / 2, 12);
    ctx.font = '10px ui-sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('exit', d.x, room.height - 7);
}

export function showNearby(html: string): void {
    nearbyEl.innerHTML = html;
    nearbyEl.classList.remove('hidden');
}

export function hideNearby(): void {
    nearbyEl.classList.add('hidden');
}

export function renderVillage(player: Player): void {
    const viewW = canvas.width / ZOOM;
    const viewH = canvas.height / ZOOM;
    const camX =
        WORLD_W <= viewW
            ? -(viewW - WORLD_W) / 2
            : Math.max(0, Math.min(WORLD_W - viewW, player.x - viewW / 2));
    const camY =
        WORLD_H <= viewH
            ? -(viewH - WORLD_H) / 2
            : Math.max(0, Math.min(WORLD_H - viewH, player.y - viewH / 2));
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-Math.round(camX), -Math.round(camY));

    ctx.drawImage(
        tileLayer,
        Math.round(camX),
        Math.round(camY),
        Math.ceil(viewW),
        Math.ceil(viewH),
        Math.round(camX),
        Math.round(camY),
        Math.ceil(viewW),
        Math.ceil(viewH),
    );

    const drawables: { y: number; draw: () => void }[] = [];
    for (const d of decorations)
        drawables.push({ y: d.y, draw: () => drawSprite(d.sprite, d.x, d.y) });
    for (const b of buildings)
        drawables.push({
            y: b.y,
            draw: () => {
                drawSprite(b.sprite, b.x, b.y);
                drawBuildingSign(b);
            },
        });
    drawables.push({
        y: player.y,
        draw: () => {
            const bob = player.walking ? Math.sin(player.walkPhase * 2) * 2 : 0;
            drawSprite(playerSpriteKey(player.facing), player.x, player.y + bob);
        },
    });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    ctx.restore();

    hideNearby();
    currentNearest = null;
    currentNearestSkill = null;
}

export function renderInterior(building: Building, player: Player, now: number): void {
    const room = building.interior;
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(
        Math.round(canvas.width / ZOOM / 2 - room.width / 2),
        Math.round(canvas.height / ZOOM / 2 - room.height / 2),
    );

    drawInteriorRoom(room);

    let nearest: Npc | null = null,
        nd = 70;
    for (const n of room.npcs) {
        const d = Math.hypot(n.x - player.x, n.y - player.y);
        if (d < nd) {
            nd = d;
            nearest = n;
        }
    }
    let nearestItem: SkillItem | null = null;
    if (room.items.length) {
        let id = 70;
        for (const it of room.items) {
            const d = Math.hypot(it.x - player.x, it.y - player.y);
            if (d < id) {
                id = d;
                nearestItem = it;
            }
        }
    }

    const drawables: { y: number; draw: () => void }[] = [];
    for (const d of room.decor) {
        drawables.push({ y: d.y, draw: () => drawSprite(d.sprite, d.x, d.y) });
    }
    for (const t of room.tables) {
        drawables.push({
            y: t.y,
            draw: () => {
                drawSprite('table', t.x, t.y);
                if (t.name) {
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(t.x - 40, t.y - 56, 80, 14);
                    ctx.fillStyle = '#fff';
                    ctx.font = '11px ui-sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(t.name, t.x, t.y - 49);
                }
            },
        });
    }
    for (const it of room.items) {
        drawables.push({
            y: it.y,
            draw: () => {
                const bob = Math.sin(now * 0.003 + it.x * 0.01) * 3;
                drawSprite('skill_item', it.x, it.y + bob);
                if (nearestItem === it) drawSkillItemLabel(it);
            },
        });
    }
    for (const n of room.npcs) {
        drawables.push({
            y: n.y,
            draw: () => {
                const bob = Math.sin((now + n.seed * 200) * 0.006) * 2;
                if (nearest === n) {
                    const pulse = 0.7 + Math.sin(now * 0.005) * 0.3;
                    ctx.save();
                    ctx.fillStyle = `rgba(255, 217, 102, ${0.45 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(n.x, n.y - 2, 22, 7, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(255, 217, 102, ${0.18 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(n.x, n.y - 2, 28, 10, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                drawSprite('npc_default', n.x, n.y + bob);
                drawNpcLabel(n, nearest === n);
            },
        });
    }
    drawables.push({
        y: player.y,
        draw: () => {
            const bob = player.walking ? Math.sin(player.walkPhase * 2) * 2 : 0;
            drawSprite(playerSpriteKey(player.facing), player.x, player.y + bob);
        },
    });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    ctx.restore();

    currentNearest = nearest;
    currentNearestSkill = nearestItem;
    if (nearest) {
        showNearby(
            `<b class="text-yellow-300">${nearest.agent.name}</b> — ${nearest.agent.description || nearest.agent.category} <span class="text-yellow-300">· press <b>E</b> to talk</span>`,
        );
    } else if (nearestItem) {
        showNearby(
            `<b class="text-yellow-300">${nearestItem.skill.name}</b> — ${nearestItem.skill.description || 'skill'} <span class="text-yellow-300">· press <b>E</b> to read</span>`,
        );
    } else {
        hideNearby();
    }
}

export function clearFrame(): void {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
