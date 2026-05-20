export type Agent = {
    id: string;
    name: string;
    description: string;
    content: string;
    category: string;
    subcategory?: string;
};

export type Skill = {
    id: string;
    name: string;
    description: string;
    content: string;
};

export type SpriteEntry = {
    key: string;
    w: number;
    h: number;
    fallbackColor: string;
    label: string | null;
    ready: boolean;
    missing: boolean;
    img: HTMLImageElement | null;
};

export type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Door = { x: number; y: number; w: number; h: number };
export type Table = { name: string | null; x: number; y: number };

export type Npc = {
    agent: Agent;
    home: Vec2;
    x: number;
    y: number;
    seed: number;
};

export type SkillItem = { skill: Skill; x: number; y: number };

export type Decoration = { sprite: string; x: number; y: number };

export type Interior = {
    name: string;
    width: number;
    height: number;
    tables: Table[];
    items: SkillItem[];
    npcs: Npc[];
    decor: Decoration[];
    solids: Rect[];
    exitDoor: Door;
};

export type Facing = 'north' | 'south' | 'east' | 'west';

export type Building = {
    x: number;
    y: number;
    w: number;
    h: number;
    sprite: string;
    name: string;
    door: Door;
    exitOffset: Vec2;
    exitFacing: Facing;
    interior: Interior;
};

export type Player = {
    x: number;
    y: number;
    facing: Facing;
    walking: boolean;
    walkPhase: number;
};

export type Scene = 'village' | 'interior';

export type ChatMessage = { role: 'you' | 'npc'; text: string };

export type MsgVariant = 'you' | 'npc' | 'err' | 'typing';

export type DoorPlacement = {
    door: Door;
    exitOffset: Vec2;
    exitFacing: Facing;
};
