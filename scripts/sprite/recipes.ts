// Assembles the full sprite atlas by composing data-driven entries from
// `buildingSpecs`, character `Look`s, and the `props` map. To add a new sprite:
//   - building → add a line to `buildingSpecs` in ./buildings.ts
//   - prop     → add a draw function + entry in `props` in ./props.ts
//   - character variant → add a Look in ./characters.ts + a `characters[]` entry below

import type { Canvas } from './canvas';
import { Canvas as CanvasClass } from './canvas';
import { buildingSpecs, drawBuilding } from './buildings';
import {
    FACINGS,
    NPC_LOOK,
    PLAYER_LOOK,
    drawHumanoid,
    type Facing,
    type HumanoidLook,
} from './characters';
import { props } from './props';

export type Recipe = { w: number; h: number; draw: (c: Canvas) => void };

const DEFAULT_BUILDING_SIZE = { w: 180, h: 140 };

type CharacterDef = {
    keyBase: string; // e.g. 'player' → emits 'player' + 'player_n' + 'player_e' + 'player_w'
    size: { w: number; h: number };
    look: HumanoidLook;
    facings?: Facing[]; // defaults to ['south'] only
};

const characters: CharacterDef[] = [
    { keyBase: 'player', size: { w: 32, h: 48 }, look: PLAYER_LOOK, facings: FACINGS },
    { keyBase: 'npc_default', size: { w: 28, h: 44 }, look: NPC_LOOK },
];

function characterKey(base: string, facing: Facing): string {
    if (facing === 'south') return base;
    return `${base}_${facing[0]}`; // _n, _e, _w
}

export function buildRecipes(): Record<string, Recipe> {
    const recipes: Record<string, Recipe> = {};

    // Buildings
    for (const [name, spec] of Object.entries(buildingSpecs)) {
        const size = spec.size ?? DEFAULT_BUILDING_SIZE;
        recipes[`building_${name}`] = {
            w: size.w,
            h: size.h,
            draw: (c) => drawBuilding(c, spec),
        };
    }

    // Characters (one per facing)
    for (const def of characters) {
        const facings = def.facings ?? ['south'];
        for (const facing of facings) {
            recipes[characterKey(def.keyBase, facing)] = {
                w: def.size.w,
                h: def.size.h,
                draw: (c) => drawHumanoid(c, def.look, facing),
            };
        }
    }

    // Free-standing props
    for (const [key, prop] of Object.entries(props)) {
        recipes[key] = prop;
    }

    return recipes;
}

// Re-exports so tests / consumers don't need to know the internal module map.
export { CanvasClass as Canvas };
