// ---------- types ----------
type Agent = {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  subcategory?: string;
};
type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
};
type SpriteEntry = {
  key: string;
  w: number;
  h: number;
  fallbackColor: string;
  label: string | null;
  ready: boolean;
  missing: boolean;
  img: HTMLImageElement | null;
};
type Vec2 = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Door = { x: number; y: number; w: number; h: number };
type Table = { name: string | null; x: number; y: number };
type Npc = {
  agent: Agent;
  home: Vec2;
  x: number;
  y: number;
  seed: number;
};
type SkillItem = { skill: Skill; x: number; y: number };
type Interior = {
  name: string;
  width: number;
  height: number;
  tables: Table[];
  items: SkillItem[];
  npcs: Npc[];
  exitDoor: Door;
};
type Building = {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: string;
  name: string;
  door: Door;
  interior: Interior;
};
type Decoration = { sprite: string; x: number; y: number };
type Player = {
  x: number;
  y: number;
  facing: "north" | "south" | "east" | "west";
  walking: boolean;
  walkPhase: number;
};
type Scene = "village" | "interior";
type ChatMessage = { role: "you" | "npc"; text: string };

(async function () {
  // ---------- constants ----------
  const TILE = 64;
  const MAP_W = 20, MAP_H = 12;
  const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
  const PLAYER_SPEED = 220;
  const PLAYER_RUN = 380;

  // ---------- data ----------
  const [agentsRes, skillsRes] = (await Promise.all([
    fetch("/api/agents").then(r => r.json()),
    fetch("/api/skills").then(r => r.json()),
  ])) as [Agent[], Skill[]];
  const byCategory: Record<string, Agent[]> = {};
  for (const a of agentsRes) (byCategory[a.category] ||= []).push(a);
  const categories = Object.keys(byCategory).sort();

  // ---------- canvas ----------
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  addEventListener("resize", resize);

  // ---------- sprite system ----------
  // Drop PNG into /public/sprites/<key>.png to replace placeholder.
  // Each sprite is anchored at bottom-center for painter's-algorithm draw.
  const sprites: Record<string, SpriteEntry> = {};
  function defineSprite(key: string, w: number, h: number, fallbackColor: string, label: string | null): SpriteEntry {
    const entry: SpriteEntry = { key, w, h, fallbackColor, label: label ?? key, ready: false, missing: false, img: null };
    const img = new Image();
    img.onload = () => { entry.ready = true; entry.img = img; };
    img.onerror = () => { entry.missing = true; };
    img.src = `/sprites/${key}.png`;
    sprites[key] = entry;
    return entry;
  }
  function drawSprite(key: string, x: number, y: number, scale = 1): void {
    const s = sprites[key];
    if (!s) return;
    const w = s.w * scale, h = s.h * scale;
    const dx = Math.round(x - w / 2), dy = Math.round(y - h);
    if (s.ready && s.img) {
      ctx.drawImage(s.img, dx, dy, w, h);
    } else {
      ctx.fillStyle = s.fallbackColor;
      ctx.fillRect(dx, dy, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(dx, dy + h - 6, w, 6);
      if (s.label) {
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.max(10, h * 0.12)}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.label, dx + w / 2, dy + h / 2);
      }
    }
  }

  defineSprite("building_api",          180, 140, "#9bb6d4", "API");
  defineSprite("building_architecture", 180, 140, "#a695d4", "ARCH");
  defineSprite("building_database",     180, 150, "#c4956b", "DATABASE");
  defineSprite("building_nextjs",       180, 140, "#2a2a2a", "NEXT.JS");
  defineSprite("building_payments",     180, 140, "#7bb87b", "PAYMENTS");
  defineSprite("building_react",        180, 140, "#61dafb", "REACT");
  defineSprite("building_ui",           180, 140, "#e89bd4", "UI");
  defineSprite("building_skills",       160, 120, "#d4c069", "SKILL HUT");
  defineSprite("npc_default",            28,  44, "#cc4444", null);
  defineSprite("player",                 32,  48, "#3366cc", "you");
  defineSprite("tree",                   52,  72, "#2f6b2f", "tree");
  defineSprite("rock",                   30,  24, "#777777", null);
  defineSprite("flower",                 14,  18, "#ffaacc", null);
  defineSprite("table",                  56,  34, "#6b4423", "table");
  defineSprite("skill_item",             30,  30, "#ffd966", null);

  // ---------- tilemap ----------
  // 0=grass, 1=dark grass, 2=path, 3=plaza, 4=water, 5=sand
  const map = new Uint8Array(MAP_W * MAP_H);
  function tileAt(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return map[ty * MAP_W + tx];
  }
  function setTile(tx: number, ty: number, v: number): void {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    map[ty * MAP_W + tx] = v;
  }
  function rand(seed: number): number {
    let x = (seed * 9301 + 49297) % 233280;
    return x / 233280;
  }

  function generateMap() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        setTile(x, y, rand(x * 91 + y * 53) < 0.18 ? 1 : 0);
      }
    }
    const cx = MAP_W / 2, cy = MAP_H / 2;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (Math.hypot(x - cx, y - cy) < 1.6) setTile(x, y, 3);
      }
    }
  }

  function bakeTileLayer() {
    const off = document.createElement("canvas");
    off.width = WORLD_W;
    off.height = WORLD_H;
    const o = off.getContext("2d");
    const colors = ["#5fa84a", "#4f9a3c", "#b59766", "#c9b58f", "#3a7fb8", "#dfc99b"];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = tileAt(x, y);
        o.fillStyle = colors[t];
        o.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (t === 0 || t === 1) {
          o.fillStyle = "rgba(0,0,0,0.05)";
          const seed = x * 17 + y * 7;
          for (let s = 0; s < 3; s++) {
            const px = (x * TILE) + rand(seed + s) * TILE;
            const py = (y * TILE) + rand(seed + s + 99) * TILE;
            o.fillRect(px, py, 2, 2);
          }
        }
      }
    }
    return off;
  }

  // ---------- world entities ----------
  const buildings: Building[] = [];
  const decorations: Decoration[] = [];
  const obstacles: Rect[] = [];

  function buildInterior(name: string, agents: Agent[] | null, skills: Skill[] | null): Interior {
    const groups: Record<string, Agent[]> = {};
    for (const a of (agents || [])) (groups[a.subcategory || "_main"] ||= []).push(a);
    const subKeys = Object.keys(groups);
    const isSkillHut = !!skills;

    const cols = isSkillHut ? skills!.length : Math.max(1, subKeys.length);
    const width = Math.max(560, 220 + cols * 220);
    const height = 460;
    const tables: Table[] = [];
    const items: SkillItem[] = [];
    const npcs: Npc[] = [];

    function npcsAround(arr: Agent[], tx: number, ty: number, rx: number, ry: number): void {
      arr.forEach((agent, i) => {
        const ang = (i / Math.max(1, arr.length)) * Math.PI * 2;
        npcs.push({
          agent,
          home: { x: tx + Math.cos(ang) * rx, y: ty + Math.sin(ang) * ry },
          x: 0, y: 0,
          seed: (Math.sin(i * 73 + tx * 0.13) + 1) * Math.PI,
        });
      });
    }

    if (isSkillHut) {
      skills.forEach((s, i) => {
        const tx = ((i + 1) / (skills.length + 1)) * width;
        const ty = height / 2;
        items.push({ skill: s, x: tx, y: ty });
      });
    } else if (subKeys.length === 1 && subKeys[0] === "_main") {
      const tx = width / 2, ty = height / 2 - 20;
      tables.push({ name: null, x: tx, y: ty });
      npcsAround(groups._main, tx, ty + 10, 130, 90);
    } else {
      subKeys.forEach((sub, i) => {
        const tx = ((i + 1) / (subKeys.length + 1)) * width;
        const ty = height / 2 - 20;
        tables.push({ name: sub, x: tx, y: ty });
        npcsAround(groups[sub], tx, ty + 10, 90, 65);
      });
    }

    return {
      name, width, height, tables, items, npcs,
      exitDoor: { x: width / 2, y: height - 18, w: 56, h: 18 },
    };
  }

  function placeBuilding(category: string, x: number, y: number, agents: Agent[]): void {
    const sprite = sprites[`building_${category}`] ?? sprites.building_api;
    const w = sprite.w, h = sprite.h;
    const b = {
      x, y, w, h,
      sprite: `building_${category}`,
      name: category,
      door: { x, y: y + 4, w: 44, h: 18 },
      interior: buildInterior(category, agents, null),
    };
    buildings.push(b);
    const baseTop = y - h * 0.4;
    const baseLeft = x - w / 2 + 12;
    const baseRight = x + w / 2 - 12;
    const doorLeft = x - 22, doorRight = x + 22;
    obstacles.push({ x: baseLeft, y: baseTop, w: doorLeft - baseLeft, h: h * 0.4 - 14 });
    obstacles.push({ x: doorRight, y: baseTop, w: baseRight - doorRight, h: h * 0.4 - 14 });
  }

  function placeSkillHut(x: number, y: number, skills: Skill[]): void {
    const sprite = sprites.building_skills;
    const w = sprite.w, h = sprite.h;
    const b = {
      x, y, w, h,
      sprite: "building_skills",
      name: "Skill Hut",
      door: { x, y: y + 4, w: 44, h: 18 },
      interior: buildInterior("Skill Hut", null, skills),
    };
    buildings.push(b);
    const baseTop = y - h * 0.4;
    const baseLeft = x - w / 2 + 12;
    const baseRight = x + w / 2 - 12;
    const doorLeft = x - 22, doorRight = x + 22;
    obstacles.push({ x: baseLeft, y: baseTop, w: doorLeft - baseLeft, h: h * 0.4 - 14 });
    obstacles.push({ x: doorRight, y: baseTop, w: baseRight - doorRight, h: h * 0.4 - 14 });
  }

  function scatterDecorations(): void {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    for (let i = 0; i < 70; i++) {
      const ang = rand(i * 13 + 1) * Math.PI * 2;
      const r = 110 + rand(i * 23 + 5) * 120;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (!isOpenGround(x, y, 28)) continue;
      const roll = rand(i * 19 + 3);
      if (roll < 0.55) {
        decorations.push({ sprite: "tree", x, y });
        obstacles.push({ x: x - 18, y: y - 12, w: 36, h: 18 });
      } else if (roll < 0.8) {
        decorations.push({ sprite: "rock", x, y });
      } else {
        decorations.push({ sprite: "flower", x, y });
      }
    }
  }

  function isOpenGround(x: number, y: number, pad: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const t = tileAt(tx, ty);
    if (t === 3 || t === 4 || t === 2) return false;
    for (const o of obstacles) {
      if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return false;
    }
    for (const d of decorations) {
      if (Math.hypot(x - d.x, y - d.y) < pad) return false;
    }
    return true;
  }

  generateMap();
  const tileLayer = bakeTileLayer();

  const wcx = WORLD_W / 2, wcy = WORLD_H / 2;
  const ringR = 230;
  const total = categories.length + 1;
  categories.forEach((cat, i) => {
    const ang = (i / total) * Math.PI * 2 - Math.PI / 2;
    placeBuilding(cat, wcx + Math.cos(ang) * ringR, wcy + Math.sin(ang) * ringR, byCategory[cat]);
  });
  const skillAng = (categories.length / total) * Math.PI * 2 - Math.PI / 2;
  placeSkillHut(wcx + Math.cos(skillAng) * ringR, wcy + Math.sin(skillAng) * ringR, skillsRes);
  scatterDecorations();

  // ---------- player + scene ----------
  const player: Player = { x: wcx, y: wcy + 80, facing: "south", walking: false, walkPhase: 0 };
  let scene: Scene = "village";
  let currentBuilding: Building | null = null;
  let villageReturnPos: Vec2 | null = null;

  // ---------- input ----------
  const keys = {};
  addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault(); });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  // ---------- collision ----------
  function blockedVillage(px: number, py: number): boolean {
    const r = 10;
    for (const o of obstacles) {
      if (px + r > o.x && px - r < o.x + o.w && py + r > o.y && py - r < o.y + o.h) return true;
    }
    const t = tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
    if (t === 4) return true;
    if (px < 16 || py < 16 || px > WORLD_W - 16 || py > WORLD_H - 16) return true;
    return false;
  }

  function blockedInterior(px: number, py: number): boolean {
    const room = currentBuilding!.interior;
    const r = 10, pad = 18;
    if (px < pad || py < pad || px > room.width - pad || py > room.height - pad) return true;
    for (const t of room.tables) {
      if (px + r > t.x - 32 && px - r < t.x + 32 && py + r > t.y - 20 && py - r < t.y + 20) return true;
    }
    return false;
  }

  function rectContains(rect: Rect, px: number, py: number): boolean {
    return px > rect.x - rect.w / 2 && px < rect.x + rect.w / 2
        && py > rect.y - rect.h / 2 && py < rect.y + rect.h / 2;
  }

  function enterBuilding(b: Building): void {
    villageReturnPos = { x: player.x, y: player.y };
    currentBuilding = b;
    scene = "interior";
    player.x = b.interior.exitDoor.x;
    player.y = b.interior.exitDoor.y - 36;
    player.facing = "north";
  }

  function exitBuilding(): void {
    const b = currentBuilding!;
    scene = "village";
    currentBuilding = null;
    player.x = b.door.x;
    player.y = b.door.y + 28;
    player.facing = "south";
  }

  // ---------- canvas render helpers ----------
  function drawBuildingExtras(b: Building): void {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(b.x - 60, b.y - b.h - 22, 120, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.name.toUpperCase(), b.x, b.y - b.h - 13);
    ctx.fillStyle = "rgba(255, 217, 102, 0.18)";
    ctx.fillRect(b.door.x - b.door.w / 2, b.door.y - b.door.h / 2, b.door.w, b.door.h);
  }

  function drawNpcLabel(npc: Npc): void {
    const text = npc.agent.name;
    ctx.font = "11px ui-sans-serif";
    const w = Math.ceil(ctx.measureText(text).width) + 12;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(npc.x - w / 2, npc.y - 72, w, 16);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, npc.x, npc.y - 64);
  }

  function drawInteriorRoom(): void {
    const room = currentBuilding!.interior;
    const plankH = 32;
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(0, 0, room.width, room.height);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < room.height; y += plankH) {
      ctx.fillRect(0, y, room.width, 2);
    }
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(0, 0, room.width, 24);
    ctx.fillRect(0, 0, 14, room.height);
    ctx.fillRect(room.width - 14, 0, 14, room.height);
    ctx.fillRect(0, room.height - 14, room.width, 14);
    const d = room.exitDoor;
    ctx.fillStyle = "#c9b58f";
    ctx.fillRect(d.x - d.w / 2, room.height - 14, d.w, 14);
    ctx.fillStyle = "rgba(255, 217, 102, 0.22)";
    ctx.fillRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(room.name.toUpperCase(), room.width / 2, 12);
    ctx.font = "10px ui-sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("exit", d.x, room.height - 7);
  }

  function drawSkillItemLabel(item: SkillItem): void {
    ctx.font = "11px ui-sans-serif";
    const w = Math.ceil(ctx.measureText(item.skill.name).width) + 12;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(item.x - w / 2, item.y - 56, w, 16);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.skill.name, item.x, item.y - 48);
  }

  // ---------- chat panel (DOM) ----------
  let currentNearest: Npc | null = null;
  let currentNearestSkill: SkillItem | null = null;
  let chatAgent: Agent | null = null;
  const chatPanel = document.getElementById("chat") as HTMLElement;
  const chatName = document.getElementById("chat-name") as HTMLElement;
  const chatRole = document.getElementById("chat-role") as HTMLElement;
  const chatMsgs = document.getElementById("chat-msgs") as HTMLElement;
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const chatSend = document.getElementById("chat-send") as HTMLButtonElement;
  const chatForm = document.getElementById("chat-form") as HTMLFormElement;
  const chatClose = document.getElementById("chat-close") as HTMLButtonElement;
  const chatReset = document.getElementById("chat-reset") as HTMLButtonElement;
  const skillModal = document.getElementById("skill-modal") as HTMLElement;
  const skillModalName = document.getElementById("skill-modal-name") as HTMLElement;
  const skillModalDesc = document.getElementById("skill-modal-desc") as HTMLElement;
  const skillModalBody = document.getElementById("skill-modal-body") as HTMLElement;
  const skillModalClose = document.getElementById("skill-modal-close") as HTMLButtonElement;
  function skillModalOpen(): boolean { return !skillModal.classList.contains("hidden"); }
  function openSkillModal(skill: Skill): void {
    skillModalName.textContent = skill.name;
    skillModalDesc.textContent = skill.description || "";
    skillModalBody.textContent = skill.content;
    skillModal.classList.remove("hidden");
    skillModal.classList.add("flex");
  }
  function closeSkillModal(): void {
    skillModal.classList.add("hidden");
    skillModal.classList.remove("flex");
  }
  skillModalClose.addEventListener("click", closeSkillModal);
  skillModal.addEventListener("click", (e) => {
    if (e.target === skillModal) closeSkillModal();
  });
  const histories = new Map<string, ChatMessage[]>();

  const MSG_BASE = "mb-3.5 leading-relaxed whitespace-pre-wrap break-words";
  type MsgVariant = "you" | "npc" | "err" | "typing";
  const MSG_VARIANT: Record<MsgVariant, string> = {
    you: "text-sky-300",
    npc: "text-zinc-100",
    err: "text-red-400 text-xs",
    typing: "text-zinc-500 italic text-xs",
  };
  function chatOpen(): boolean { return !chatPanel.classList.contains("hidden"); }
  function showChat(): void { chatPanel.classList.remove("hidden"); chatPanel.classList.add("flex"); }
  function hideChat(): void { chatPanel.classList.add("hidden"); chatPanel.classList.remove("flex"); }

  function openChat(agent: Agent): void {
    chatAgent = agent;
    chatName.textContent = agent.name;
    chatRole.textContent = agent.description || agent.category || "";
    chatMsgs.innerHTML = "";
    const hist = histories.get(agent.id) || [];
    for (const m of hist) appendMsg(m.role, m.text);
    showChat();
    setTimeout(() => chatInput.focus(), 50);
  }
  function closeChat(): void {
    hideChat();
    chatAgent = null;
  }
  function appendMsg(role: "you" | "npc", text: string, variant?: MsgVariant): HTMLDivElement {
    const div = document.createElement("div");
    const v: MsgVariant = variant ?? role;
    div.className = `${MSG_BASE} ${MSG_VARIANT[v] || ""}`.trim();
    div.textContent = role === "you" ? `you › ${text}` : text;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
  }

  chatClose.addEventListener("click", closeChat);
  chatReset.addEventListener("click", async () => {
    if (!chatAgent) return;
    histories.delete(chatAgent.id);
    chatMsgs.innerHTML = "";
    await fetch("/api/chat/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: chatAgent.id }),
    });
  });
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!chatAgent) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    chatSend.disabled = true;

    const hist = histories.get(chatAgent.id) || [];
    hist.push({ role: "you", text });
    histories.set(chatAgent.id, hist);
    appendMsg("you", text);
    const npcDiv = appendMsg("npc", "");
    const typing = appendMsg("npc", "thinking…", "typing");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: chatAgent.id,
          system: chatAgent.content,
          message: text,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let started = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const ev of events) {
          const line = ev.split("\n").find(l => l.startsWith("data: "));
          if (!line) continue;
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.type === "chunk") {
              if (!started) { typing.remove(); started = true; }
              full += obj.text;
              npcDiv.textContent = full;
              chatMsgs.scrollTop = chatMsgs.scrollHeight;
            } else if (obj.type === "error") {
              if (!started) typing.remove();
              npcDiv.className = `${MSG_BASE} ${MSG_VARIANT.err}`;
              npcDiv.textContent = `error: ${obj.error}`;
            }
          } catch {}
        }
      }
      if (!started) typing.remove();
      if (full) hist.push({ role: "npc", text: full });
    } catch (err) {
      typing.remove();
      npcDiv.className = `${MSG_BASE} ${MSG_VARIANT.err}`;
      npcDiv.textContent = `error: ${err.message || err}`;
    } finally {
      chatSend.disabled = false;
      chatInput.focus();
    }
  });

  addEventListener("keydown", (e) => {
    if (chatOpen()) {
      if (e.key === "Escape") { e.preventDefault(); closeChat(); }
      return;
    }
    if (skillModalOpen()) {
      if (e.key === "Escape") { e.preventDefault(); closeSkillModal(); }
      return;
    }
    if (e.key.toLowerCase() === "e") {
      if (currentNearest) { e.preventDefault(); openChat(currentNearest.agent); }
      else if (currentNearestSkill) { e.preventDefault(); openSkillModal(currentNearestSkill.skill); }
    }
  }, true);

  // ---------- main loop ----------
  const nearbyEl = document.getElementById("nearby") as HTMLElement;
  function showNearby(html: string): void { nearbyEl.innerHTML = html; nearbyEl.classList.remove("hidden"); }
  function hideNearby(): void { nearbyEl.classList.add("hidden"); }

  let last = performance.now();
  document.getElementById("loading").remove();

  function update(dt: number, now: number): void {
    if (chatOpen() || skillModalOpen()) {
      player.walking = false;
      return;
    }
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    const len = Math.hypot(dx, dy);
    const speed = keys["shift"] ? PLAYER_RUN : PLAYER_SPEED;
    player.walking = len > 0;
    if (len > 0) {
      dx /= len; dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? "east" : "west";
      else player.facing = dy > 0 ? "south" : "north";
      const nx = player.x + dx * speed * dt;
      const ny = player.y + dy * speed * dt;
      const isBlocked = scene === "village" ? blockedVillage : blockedInterior;
      if (!isBlocked(nx, player.y)) player.x = nx;
      if (!isBlocked(player.x, ny)) player.y = ny;
      player.walkPhase += dt * (keys["shift"] ? 12 : 8);
    }

    if (scene === "village") {
      for (const b of buildings) {
        if (rectContains(b.door, player.x, player.y)) { enterBuilding(b); break; }
      }
    } else {
      const room = currentBuilding!.interior;
      if (rectContains(room.exitDoor, player.x, player.y)) exitBuilding();
      for (const n of room.npcs) {
        const t = now * 0.0005 + n.seed;
        n.x = n.home.x + Math.cos(t) * 10;
        n.y = n.home.y + Math.sin(t * 1.3) * 6;
      }
    }
  }

  function renderVillage(now: number): void {
    const camX = WORLD_W <= canvas.width
      ? -(canvas.width - WORLD_W) / 2
      : Math.max(0, Math.min(WORLD_W - canvas.width, player.x - canvas.width / 2));
    const camY = WORLD_H <= canvas.height
      ? -(canvas.height - WORLD_H) / 2
      : Math.max(0, Math.min(WORLD_H - canvas.height, player.y - canvas.height / 2));
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    ctx.drawImage(
      tileLayer,
      Math.round(camX), Math.round(camY), canvas.width, canvas.height,
      Math.round(camX), Math.round(camY), canvas.width, canvas.height,
    );

    const drawables = [];
    for (const d of decorations) drawables.push({ y: d.y, draw: () => drawSprite(d.sprite, d.x, d.y) });
    for (const b of buildings) drawables.push({ y: b.y, draw: () => { drawSprite(b.sprite, b.x, b.y); drawBuildingExtras(b); } });
    drawables.push({ y: player.y, draw: () => {
      const bob = player.walking ? Math.sin(player.walkPhase * 2) * 2 : 0;
      drawSprite("player", player.x, player.y + bob);
    }});
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    ctx.restore();

    hideNearby();
    currentNearest = null;
    currentNearestSkill = null;
  }

  function renderInterior(now: number): void {
    const room = currentBuilding!.interior;
    ctx.save();
    ctx.translate(Math.round(canvas.width / 2 - room.width / 2), Math.round(canvas.height / 2 - room.height / 2));

    drawInteriorRoom();

    let nearest: Npc | null = null, nd = 70;
    for (const n of room.npcs) {
      const d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < nd) { nd = d; nearest = n; }
    }
    let nearestItem: SkillItem | null = null;
    if (room.items.length) {
      let id = 70;
      for (const it of room.items) {
        const d = Math.hypot(it.x - player.x, it.y - player.y);
        if (d < id) { id = d; nearestItem = it; }
      }
    }

    const drawables = [];
    for (const t of room.tables) {
      drawables.push({ y: t.y, draw: () => {
        drawSprite("table", t.x, t.y);
        if (t.name) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(t.x - 40, t.y - 56, 80, 14);
          ctx.fillStyle = "#fff";
          ctx.font = "11px ui-sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(t.name, t.x, t.y - 49);
        }
      }});
    }
    for (const it of room.items) {
      drawables.push({ y: it.y, draw: () => {
        const bob = Math.sin(now * 0.003 + it.x * 0.01) * 3;
        drawSprite("skill_item", it.x, it.y + bob);
        if (nearestItem === it) drawSkillItemLabel(it);
      }});
    }
    for (const n of room.npcs) {
      drawables.push({ y: n.y, draw: () => {
        const bob = Math.sin((now + n.seed * 200) * 0.006) * 2;
        drawSprite("npc_default", n.x, n.y + bob);
        if (nearest === n) drawNpcLabel(n);
      }});
    }
    drawables.push({ y: player.y, draw: () => {
      const bob = player.walking ? Math.sin(player.walkPhase * 2) * 2 : 0;
      drawSprite("player", player.x, player.y + bob);
    }});
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    ctx.restore();

    currentNearest = nearest;
    currentNearestSkill = nearestItem;
    if (nearest) {
      showNearby(`<b class="text-yellow-300">${nearest.agent.name}</b> — ${nearest.agent.description || nearest.agent.category} <span class="text-yellow-300">· press <b>E</b> to talk</span>`);
    } else if (nearestItem) {
      showNearby(`<b class="text-yellow-300">${nearestItem.skill.name}</b> — ${nearestItem.skill.description || "skill"} <span class="text-yellow-300">· press <b>E</b> to read</span>`);
    } else {
      hideNearby();
    }
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (scene === "village") renderVillage(now);
    else renderInterior(now);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
