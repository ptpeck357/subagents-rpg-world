# Planner — Claude Village

Project tracker for Claude Code. Update this file as tasks move through states.

**Note:** the original Three.js plan was swapped for a 2D top-down (Lords of Xulima–style) canvas renderer. Phase 2 / 3 items below were re-done in 2D.

---

## Status key

- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[!]` blocked

---

## Phase 1 — Core scaffold

- [x] Design 3D world concept (Three.js, Bun + Hono, cozy low-poly)
- [x] Scaffold repo: `server.ts`, `public/index.html`, `CLAUDE.md`, `planner.md`
- [x] Implement `GET /api/agents` — scan `./subagents/**/*.md`, parse H1 + first paragraph
- [x] Implement `GET /api/skills` — scan `./skills/**/SKILL.md`, parse H1 + first paragraph
- [x] Add `POST /api/chat` — server-side proxy to Anthropic using `ANTHROPIC_API_KEY`
- [x] Serve `public/index.html` as catch-all from Hono
- [x] Verify server starts with `bun start`

## Phase 2 — 2D world

- [x] Bootstrap HTML5 canvas + game loop + sprite system with PNG-or-placeholder fallback
- [x] Tilemap: grass/dirt/path/plaza/water/sand, baked to offscreen canvas
- [x] Buildings per top-level subagent dir + tables for nested subcategories
- [x] Skill Hut building with skill items out front
- [x] Player sprite with 4-direction facing
- [x] Camera follows player, clamped to world bounds
- [x] WASD / arrow key movement with axis-separated collision
- [x] Scatter trees / rocks / flowers across the map
- [x] Pond with sand rim
- [x] Door trigger zones on each building; enter to switch into interior scene
- [x] Interior scene: wood-plank floor, walls, tables (per nested subdir), NPCs around tables
- [x] Hide NPCs in village view; they only appear inside their building
- [x] Skill Hut interior: shelves/items for each skill
- [ ] Replace placeholder rects with real sprite PNGs (drop into `public/sprites/`)
- [ ] Walk-cycle frames (north/south/east/west sprite sheets)
- [ ] Smooth fade transition between village ↔ interior

## Phase 3 — Agent NPCs

- [x] `GET /api/agents` called on page load; one NPC spawned per agent
- [x] Each NPC: sprite with floating name label when nearest
- [x] Wander behaviour: each NPC drifts within radius of home position
- [x] Proximity detection: nearest NPC tracked each frame
- [x] Heads-up bubble: show agent name + description when within range
- [ ] Per-category or per-agent NPC sprites (currently all use `npc_default`)
- [ ] Walk-cycle frames on NPC drift movement
- [ ] Highlight effect (outline / glow) on nearest NPC

## Phase 4 — Chat system

- [ ] Chat panel (right sidebar): portrait, name, role, message history, input
- [ ] On proximity: activate agent, show greeting (first paragraph) or generated
- [ ] Send message → `POST /api/chat` (server proxies to Anthropic; key stays server-side)
- [ ] System prompt = agent `.md` body content
- [ ] Conversation history persisted per agent for session duration
- [ ] Typing indicator while awaiting response
- [ ] On walk-away: panel resets, history preserved in memory for return

## Phase 5 — Skills integration

- [x] `GET /api/skills` fetched on load
- [x] Skills rendered as items on shelves inside the Skill Hut
- [ ] Clicking a skill item shows its content in a modal or side panel
- [ ] Agent chat system prompt optionally references relevant skills

## Phase 6 — Polish

- [ ] Smooth day/night cycle (ambient light animation)
- [ ] Idle NPC animations (head bob, look-around)
- [ ] Sound: soft ambient background (optional, user-toggled)
- [ ] Mobile touch controls (virtual joystick)
- [x] Loading screen while Three.js and API agents initialise
- [ ] Error state when `./subagents/` directory is missing or empty

---

## Phase 7 — CLI distribution + Claude Code auth

Goal: someone with Claude Code installed runs one command, the village opens in their browser, NPC chat just works — no `ANTHROPIC_API_KEY` ever required.

- [ ] Add `@anthropic-ai/claude-agent-sdk` dep (replaces direct Anthropic fetch)
- [ ] Rewrite `POST /api/chat` to use `query()` from the SDK, streaming chunks back to the browser
- [ ] Pass NPC's parsed `.md` body as `options.systemPrompt`; user messages flow through `prompt`
- [ ] Remove `ANTHROPIC_API_KEY` requirement (and warn-on-missing) — SDK uses the user's Claude Code login
- [ ] `package.json` `bin` entry exposing `claude-village` command
- [ ] Add `#!/usr/bin/env bun` shebang to `server.ts` + auto-open default browser to `localhost:3000` after boot
- [ ] Pick + reserve npm name; publish so `npx claude-village` (or `bunx`) Just Works
- [ ] Update `README.md` install / run instructions and remove `.env` step

## World sizing (smaller — see /plan "make-the-world-smaller")

- [x] First pass: 24×24 tiles, ringR 520, drop pond
- [x] Confirmed: at 24×24 the building ring still overflowed 1280×800. Final values below.
- [x] Final tight fit for 1280×800: **20×12 tiles (1280×768 px)**, ringR **230**, building sprites scaled down (~170w × 140h, db 180×150, skills 160×120), door zones 44×18, decoration band 110–230, plaza radius 1.6 tiles. Village fits with **0 scrolling** on a 1280×800 viewport; world auto-centers on larger viewports.

## Open questions

- Should agent home positions be user-configurable (frontmatter `x`, `z` fields)?
- Should skills appear as items the player "equips" to boost agent responses?
- Add a `bun build` step later for production, or keep zero-build forever?

---

## Notes for Claude Code

- Test endpoints with `curl` before touching the frontend
- Agent positions: deterministic — sort agents by `id` then place by index around their table / building center
- Keep Three.js scene setup modular inside `index.html` — use clearly named `function buildTerrain()`, `function buildNPC()` etc. even in a single file
- Only dep beyond `hono` should be added with explicit user approval. Agent/skill files have no YAML frontmatter, so `gray-matter` is **not** used — H1 + first paragraph parsing lives in `server.ts`
- If `./subagents/` is missing or empty, return `[]` gracefully rather than throwing
