// Humanoid sprite renderer + per-character "look" presets. One `drawHumanoid`
// call with a Facing param produces the full 4-direction set.

import { Canvas, darken, type RGBA } from './canvas';
import { P } from './palette';

export type Facing = 'south' | 'north' | 'east' | 'west';
export const FACINGS: Facing[] = ['south', 'north', 'east', 'west'];

export type HumanoidLook = {
    cloak: RGBA;
    cloakDark: RGBA;
    skin: RGBA;
    skinShadow: RGBA;
    hair: RGBA;
    boots: RGBA;
    accent?: RGBA;
    hooded?: boolean;
};

export const PLAYER_LOOK: HumanoidLook = {
    cloak: P.cloakGreen,
    cloakDark: P.cloakGreenDark,
    skin: P.skinLight,
    skinShadow: P.skinMid,
    hair: P.hairBrown,
    boots: P.leather,
    accent: P.leatherDark,
};

export const NPC_LOOK: HumanoidLook = {
    cloak: P.cloakBrown,
    cloakDark: P.cloakBrownDark,
    skin: P.skinLight,
    skinShadow: P.skinMid,
    hair: P.hairBrown,
    boots: P.leatherDark,
    hooded: true,
};

export function drawHumanoid(c: Canvas, look: HumanoidLook, facing: Facing = 'south'): void {
    const W = c.w,
        H = c.h;
    const cx = Math.floor(W / 2);
    const side = facing === 'east' ? 1 : facing === 'west' ? -1 : 0;

    c.ellipse(cx, H - 2, Math.floor(W / 2) - 2, 2, P.shadow);

    // Boots
    if (side !== 0) {
        c.rect(cx - 2, H - 6, 5, 4, look.boots);
        c.line(cx - 2, H - 6, cx + 2, H - 6, darken(look.boots, 0.4));
        c.px(cx + 2 * side + (side > 0 ? 1 : -1), H - 5, darken(look.boots, 0.4));
    } else {
        c.rect(cx - 5, H - 6, 4, 4, look.boots);
        c.rect(cx + 1, H - 6, 4, 4, look.boots);
        c.line(cx - 5, H - 6, cx - 2, H - 6, darken(look.boots, 0.4));
        c.line(cx + 1, H - 6, cx + 4, H - 6, darken(look.boots, 0.4));
    }
    c.rect(cx - 4, H - 12, 3, 6, look.cloakDark);
    c.rect(cx + 1, H - 12, 3, 6, look.cloakDark);

    const bodyTop = Math.floor(H * 0.42);
    const bodyW = side !== 0 ? Math.floor(W * 0.55) : Math.floor(W * 0.7);
    c.rect(cx - Math.floor(bodyW / 2), bodyTop, bodyW, H - bodyTop - 8, look.cloak);

    if (facing === 'north') {
        c.rect(cx - 1, bodyTop, 2, H - bodyTop - 8, look.cloakDark);
    } else if (side !== 0) {
        const trailX = side > 0 ? cx - Math.floor(bodyW / 2) : cx + Math.floor(bodyW / 2) - 2;
        c.rect(trailX, bodyTop, 2, H - bodyTop - 8, look.cloakDark);
    } else {
        c.rect(cx + Math.floor(bodyW / 2) - 3, bodyTop, 3, H - bodyTop - 8, look.cloakDark);
    }

    if (facing === 'south') {
        for (let y = bodyTop + 2; y < H - 10; y += 2) c.px(cx, y, look.cloakDark);
    }
    if (look.accent) c.rect(cx - Math.floor(bodyW / 2), H - 16, bodyW, 2, look.accent);

    if (side !== 0) {
        c.rect(cx + side * Math.floor(bodyW / 2) - 1, bodyTop + 4, 3, 10, look.cloak);
    } else {
        c.rect(cx - Math.floor(bodyW / 2) - 2, bodyTop + 4, 3, 10, look.cloak);
        c.rect(cx + Math.floor(bodyW / 2) - 1, bodyTop + 4, 3, 10, look.cloak);
    }

    const headR = Math.floor(W / 4);
    const headCy = bodyTop - headR + 2;
    c.ellipse(cx, headCy, headR, headR, look.skin);
    // Cheek shadow on the trailing side — kept BELOW the eye line so it
    // never obscures face features.
    if (facing !== 'north') {
        const shadowSideX = facing === 'west' ? cx - headR / 2 : cx + headR / 2;
        const rx = Math.max(1, Math.floor(headR / 2) - 1);
        const ry = Math.max(1, Math.floor(headR / 2));
        c.ellipse(shadowSideX, headCy + headR / 2, rx, ry, look.skinShadow);
    }

    if (look.hooded) {
        c.ellipse(cx, headCy - 1, headR + 1, headR + 1, look.cloakDark);
        if (facing === 'north') {
            c.ellipse(cx, headCy + 1, headR - 1, headR - 1, look.cloakDark);
        } else {
            c.ellipse(cx + side, headCy + 1, headR - 1, headR - 1, darken(look.skin, 0.4));
            if (side === 0) {
                c.px(cx - 1, headCy + 1, P.gold);
                c.px(cx + 2, headCy + 1, P.gold);
            } else {
                c.px(cx + side, headCy + 1, P.gold);
            }
        }
    } else {
        // Hair: only the TOP of the head (above the eye line). Leaves a clear
        // face area below. North covers more so the back of the head reads
        // as hair, not skin.
        const hairBot = facing === 'north' ? headCy + 1 : headCy - 1;
        for (let y = headCy - headR; y < hairBot; y++) {
            const dy = (y - headCy) / headR;
            const xspan = Math.sqrt(Math.max(0, 1 - dy * dy)) * headR;
            for (let x = Math.floor(cx - xspan); x <= Math.ceil(cx + xspan); x++) {
                c.px(x, y, look.hair);
            }
        }
        // Side bangs / sideburns at the temples.
        if (facing !== 'north') {
            c.px(cx - headR + 1, headCy, look.hair);
            c.px(cx + headR - 1, headCy, look.hair);
        }

        // Face features. Eyes are 2 px wide so they read at game scale.
        if (facing === 'south') {
            c.rect(cx - 3, headCy, 2, 1, P.black);
            c.rect(cx + 2, headCy, 2, 1, P.black);
            c.rect(cx - 1, headCy + 3, 2, 1, P.skinShadow);
        } else if (facing === 'east') {
            c.rect(cx + 1, headCy, 2, 1, P.black);
            c.rect(cx, headCy + 3, 2, 1, P.skinShadow);
            // Ear hint on the trailing side
            c.px(cx - headR + 1, headCy + 1, look.skinShadow);
        } else if (facing === 'west') {
            c.rect(cx - 2, headCy, 2, 1, P.black);
            c.rect(cx - 1, headCy + 3, 2, 1, P.skinShadow);
            c.px(cx + headR - 1, headCy + 1, look.skinShadow);
        }
        // North: no face features (back of head).
    }
    c.outline(cx - Math.floor(bodyW / 2), bodyTop, bodyW, H - bodyTop - 8, look.cloakDark);
}
