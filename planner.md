# Planner — Claude Village

Project tracker for Claude Code. Update this file as tasks move through states.

**Note:** the original Three.js plan was swapped for a 2D top-down (Lords of Xulima–style) canvas renderer. Phase 2 / 3 items below were re-done in 2D.

> Phase numbers below are **historical** — they reflect when work was decided, not the order to execute. For current execution order, see _Priority order_ immediately below.

---

## Session Handoff

**Last touched:** 2026-05-19 (Phase 6 error-state + Phase 9 e2e + Phase 3 NPC highlights/labels + village layout overhaul + interior decor + doors face plaza shipped).

**State of the world:** village is playable end-to-end with placeholders. Walk in, enter any of 8 buildings, talk to NPCs (SDK-backed chat), read skills (modal). Tailwind for UI. TypeScript on both server and client (client transpiled on the fly by Bun). First-clone failure lands on a helpful overlay. `claude-village` is `bun link`-ed on this machine; `/village` and `/village-stop` symlinks are live in `~/.claude/commands/`. World is **1792×1152** at a 1.6× render zoom; camera scrolls and follows the player. Doors point at the plaza, dirt paths radiate out to each, building bodies are solid, interiors have bookshelves / lamps / plants / crates.

**Shipped this session:**

- Phase 6 — defensive empty/missing handling. `server.ts` guards `loadAgents()`/`loadSkills()` with `existsSync` so a missing `./subagents/` or `./skills/` dir returns `[]` instead of throwing; `public/index.html` carries a hidden `#empty-state` overlay; `public/game.ts` removes the loading screen, shows the overlay, and bails before world init when `/api/agents` is empty.
- Phase 9 — end-to-end test on this machine. `bun link` (claude-village → `~/.bun/bin/claude-village`); symlinks `~/.claude/commands/village.md` + `village-stop.md` → repo copies. Verified from `cd /tmp` that `claude-village` serves 33 agents + 2 skills (portable paths intact). `village.md` snippet handles cold-start + port-in-use; `village-stop.md` kills :3000 cleanly.
- Phase 3 — nearest-NPC highlight (pulsing yellow ellipse under feet) + every NPC now always shows its agent name above its head (nearest gets bolder/brighter variant). `defineSprite()` now honors an explicit `null` label so the placeholder "npc_default" / "rock" / "flower" text vanishes.
- World re-spread — buildings on the 230-radius ring were touching shoulder-to-shoulder. Map bumped to **28×18 tiles (1792×1152 px)**, ringR **230→340**. Decoration scatter rewritten from a polar ring band to a **jittered 8×5 grid** (one prop per cell) — fewer total, evenly distributed, with a 40 px isOpenGround pad and 90 px clearance from any building door so trees can't block the approach.
- Render zoom — `ZOOM = 1.6` in `public/game.ts`; both `renderVillage()` and `renderInterior()` apply `ctx.scale(ZOOM, ZOOM)` and use a `canvas / ZOOM`-sized viewport for the camera. Pixel-art look kept via the existing `image-rendering: pixelated` CSS.
- Building label cleanup — removed the floating black banner above each building in `drawBuildingExtras()` (it duplicated the centered placeholder-sprite label). Door indicator is now a brighter pulsing yellow rect + outline + pulsing ▼ glyph above the door.
- Doors face the plaza — `pickDoor()` chooses N/S/E/W face by dominant axis of the building→center vector. `Building` gained `exitOffset: Vec2` + `exitFacing` so `exitBuilding()` drops the player on the correct side after walking out. Layout flow now: `generateMap()` → precompute slot positions + doors → `paintPath()` from plaza center to each door (tile 2 / dirt) → `bakeTileLayer()` → place buildings. Door trigger expanded by 12 px so brushing the edge of the door zone is enough to enter — no need to walk the player center into the small rect.
- Building collision — single full-sprite-footprint solid (was bottom 40 % only, so the player could clip into the roof). Door pad is the only entry point; it sits just outside the chosen face.
- Interior decor — `Interior` gained `decor: Decoration[]` + `solids: Rect[]`. Skill Hut now arranges **bookshelves** along the back wall with skill items lined up in front of them; regular interiors get **lamps** near tables, **plants** in the corners, and a **crate** on the side wall. `blockedInterior()` now also tests `room.solids`.
- New placeholder sprites added: `bookshelf`, `rug` (defined but unused for now), `lamp`, `plant`, `crate`.
- Lint + format tooling — added `prettier` and `eslint` (flat config + typescript-eslint) as devDeps. Configs: `.prettierrc.json` (printWidth 100, tabWidth 4, singleQuote, semi, trailingComma all, endOfLine lf), `.prettierignore`, `eslint.config.js`. Scripts: `format`, `format:check`, `lint`, `lint:fix`. Baseline applied across the codebase.
- TS strictness sweep — fixed all `tsc --noEmit` errors in client: typed `keys` as `Record<string, boolean>`, narrowed `KeyboardEvent` handlers, cast `getContext('2d')`, guarded `getElementById('loading')?.remove()`, narrowed `err: unknown` in catch.
- **Module split** (~990-line `public/game.ts` → 4 files under `public/src/`): `types.ts` (all shared types), `world.ts` (constants, sprite table + 20 `defineSprite()` calls, tilemap, `pickDoor`/`placeBuilding`/`placeSkillHut`/`scatterDecorations`/`paintPath`/`isOpenGround`/`buildInterior`, collision, `layoutWorld()`), `render.ts` (`drawSprite` + draw helpers + `renderVillage`/`renderInterior` + `showNearby`/`hideNearby` + `clearFrame`, `setRenderContext` once-init), `main.ts` (data fetch, empty-state, canvas setup, player/scene state, input, chat panel + skill modal, `update()`/`frame()`, `enterBuilding`/`exitBuilding`). Server pipeline swapped from `Bun.Transpiler` (single-file TS strip) to `Bun.build({ format: 'esm' })` (bundles `public/src/main.ts` → `/game.js`), cached by max mtime across `public/src/*.ts`. `index.html` script tag now `type="module"`. Old `public/game.ts` deleted.

**Next session should start with:** Phase 7 follow-up — June 15 OAuth swap. Calendar-gated, ~27 days out. After that, Phase 2/3 sprite art whenever PNGs land. Phase 6 polish (day/night, idle anims, sound, mobile touch) remains as low-priority work whenever you want visible polish. Client is now bundled — `bun build` runs per `/game.js` request when any source under `public/src/` changes.

**Open prerequisites that block other work:**

- Chat won't actually return responses until `ANTHROPIC_API_KEY` is set in `.env` (today's path) — or until 2026-06-15 when the SDK runs on the Pro plan's free credit via `claude setup-token`. Server gracefully returns the SDK error if unset.
- Sprite art (Phase 2/3 placeholders) waits on PNGs being dropped into `public/sprites/`.

**Active gotchas to remember:**

- `Bun.file()` has **no** `.stat()` method — use `BunFile.lastModified` (epoch ms) for mtime
- Background-session isolation guard is **off** for this repo via `.claude/settings.json` — don't re-enable unless you intentionally want bg sessions to clone into a worktree
- `Agent` and `Skill` types live in two places: `server.ts` (server-side) + `public/src/types.ts` (client-side). Kept in sync by hand because the server and client are bundled separately. If they drift, the client deserializes garbage.
- Chat panel show/hide MUST use the `showChat`/`hideChat` helpers (Tailwind `hidden` ↔ `flex` swap), not direct `style.display`
- The `bgIsolation: none` setting means edits land in the shared checkout — be deliberate about destructive ops
- Empty-state overlay uses the same `hidden` ↔ `grid` swap pattern as the chat panel — toggle via classList, not `style.display`
- `ZOOM` in `game.ts` is render-only — camera math is `camX/camY` in world space, sized to `canvas / ZOOM`. World-space coords (player.x/y, NPC home, collision rects) never see the zoom factor
- `defineSprite(key, w, h, color, label)`: pass `null` for `label` to render the placeholder rect _without_ any text. The previous `label ?? key` fallback used to bleed the key (e.g. "npc_default") onto the sprite — don't bring that back
- Doors are not always south. `Building.exitOffset` + `exitFacing` are computed once by `pickDoor()` and drive `exitBuilding()` — don't hard-code `+28y` or "south" anywhere else
- Plaza paths are tile-painted _before_ `bakeTileLayer()` runs. If you add new buildings or move them after baking, the path won't redraw — paint first, bake once
- Client is now bundled, not transpiled. Edits to `public/src/*.ts` invalidate the `/game.js` cache via max-mtime; `Bun.build({ format: 'esm' })` re-bundles on next hit. `index.html` loads the result with `type="module"` — don't drop the attribute or the `import`/`export` syntax becomes a parse error
- Module live bindings: `tileLayer` is `export let` in `world.ts`, reassigned inside `layoutWorld()`. `render.ts` imports it and reads the live binding. Same trick for `currentNearest`/`currentNearestSkill` in `render.ts` consumed by `main.ts`. Don't `import` a snapshot into a local `const` if you need the latest value

**Pending decisions parked:**

- Per-agent NPC sprites: naming convention `npc_<id>.png` → `npc_default.png` fallback? Not yet implemented.
- localStorage chat history persistence: skipped for now; in-memory only.
- ~~Splitting `game.ts` into modules + `bun build`~~: shipped 2026-05-19; client lives under `public/src/` as `types.ts` / `world.ts` / `render.ts` / `main.ts`.

---

## Priority order (what to work on next)

Phases 1, 2, 3, 4, 5, 7, 8, 9 are largely shipped — see their sections for residual checkboxes. Phase 6 defensive empty-state landed 2026-05-19; only the polish sub-items remain. What's open, in the order it should be tackled:

1. **Phase 7 follow-up — June 15 OAuth swap.** Calendar-gated. As soon as 2026-06-15 lands: remove `ANTHROPIC_API_KEY` requirement, document `claude setup-token`, point users at Pro plan included credit.
2. **Phase 2/3 — real sprite PNG art + walk-cycle frames + nearest-NPC highlight.** Blocked on actual art assets being dropped into `public/sprites/`. Move up the list when that lands.
3. **Phase 6 polish — day/night cycle, idle NPC animations, ambient sound, mobile touch controls.** Real polish; do last.

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
- [x] Add `POST /api/chat` — server-side Agent SDK call streaming via SSE (was originally a direct Anthropic proxy; superseded by Phase 7)
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
- [x] ~~Pond with sand rim~~ — built then removed when world shrank to fit 1280×800
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
- [x] Highlight effect (outline / glow) on nearest NPC — pulsing yellow ellipse drawn under feet of nearest NPC in interior scene, in `renderInterior()` of `public/game.ts`. Two stacked ellipses (22×7 inner + 28×10 outer halo) with `Math.sin(now * 0.005)` pulse.

## Phase 4 — Chat system (shipped via Phase 7 with the SDK)

- [x] Chat panel (right sidebar): name, role, message history, input
- [x] On proximity: **E** key opens the agent with their `.md` body as system prompt
- [x] Send message → `POST /api/chat` (Agent SDK; key/token stays server-side)
- [x] System prompt = agent `.md` body content
- [x] Conversation history persisted per agent for session duration (in-memory `histories` Map in `game.js`)
- [x] Typing indicator while awaiting response
- [x] On walk-away: panel closes via **Esc**, history preserved in memory for return
- [ ] Portrait sprite next to name (still uses placeholder color)

## Phase 5 — Skills integration

- [x] `GET /api/skills` fetched on load
- [x] Skills rendered as items on shelves inside the Skill Hut
- [x] Walk near a skill item + press **E** → modal opens with name, description, full content. **Esc** or click outside closes. Movement pauses while open.
- [x] Agent chat system prompt automatically references relevant skills. `server.ts/relevantSkills()` keyword-matches skill `id` + `name` tokens (filtered to length > 3, minus generic stop words like "skill") against the agent's persona text. Matched skills are appended under a `# Relevant skills` heading before the SDK call. Today: Stripe-flavored agents pick up `stripe-safety`; agents mentioning "secret" pick up `secret-scan`.

## Phase 6 — Polish

- [ ] Smooth day/night cycle (ambient light animation)
- [ ] Idle NPC animations (head bob, look-around)
- [ ] Sound: soft ambient background (optional, user-toggled)
- [ ] Mobile touch controls (virtual joystick)
- [x] Loading screen while canvas and API agents initialise
- [x] Error state when `./subagents/` directory is missing or empty — `server.ts` guards `loadAgents()`/`loadSkills()` with `existsSync` so a missing dir returns `[]` rather than throwing; `public/index.html` carries a hidden `#empty-state` overlay; `public/game.ts` shows it (and bails before world init) when `/api/agents` returns empty

---

## Phase 7 — CLI-only, browser UI, chat bridged to user's Claude Code

### The idea (in user's words)

- **No API key.** Don't want to plug `ANTHROPIC_API_KEY` in. Don't want a separate Anthropic billing path.
- **One agent only — the user's own Claude Code.** Whatever model / login / quota Claude Code already has, reuse it.
- **The "subagents" in this RPG are _topic personas_, not separate API accounts.** Each NPC is a way of asking the same underlying agent about a specific topic (api design, react patterns, payments, etc.). The subagent's `.md` body is just a system prompt / persona that gets handed to the same Claude Code session.
- **Distribution = single CLI command, browser UI.** Type `claude-village` (or similar) in a terminal → it boots a local server → opens the user's default browser to the 2D village → walking up to an NPC and typing in the chat panel sends that message _back into the user's Claude Code_ with the NPC's persona attached → response streams into the browser bubble.

The browser is just the _visual layer_. All language model traffic stays inside the user's existing Claude Code installation. No env vars, no `.env`, no extra accounts.

### Architecture sketch

```
┌────────── terminal ──────────┐        ┌──────── browser ────────┐
│  $ claude-village            │        │  http://localhost:3000  │
│  ─────────────────────────── │        │                         │
│  Bun + Hono server (this     │ ◀────▶ │  2D village canvas       │
│  repo's server.ts)            │  HTTP  │  + chat panel            │
│                              │        │                         │
│  POST /api/chat handler:     │        │  user types in panel ──▶ │
│   - reads NPC persona (.md)  │        │  POST /api/chat         │
│   - calls Claude Code        │        │                         │
│     (SDK or `claude -p`)     │        │  ◀── streamed reply     │
│   - streams chunks back      │        │                         │
└──────────────────────────────┘        └─────────────────────────┘
```

### Open question: how exactly to call "the user's Claude Code"

Two candidate mechanisms — both avoid an Anthropic API key. Pick before coding.

1. **`@anthropic-ai/claude-agent-sdk` (`query()`)** — Node/Bun SDK that spawns a Claude Code session under the hood, inheriting the user's CLI auth. Streaming built-in. Persona = `options.systemPrompt`. Conversation memory = `options.continue` or per-session resume.
2. **Shell out to `claude -p "<message>"`** — headless one-shot of the Claude Code binary. Simpler, no extra dep. Conversation memory via `--resume <session-id>` flag stored per-NPC.

Both reuse Claude Code's existing login → zero API key needed. SDK is cleaner for streaming; shell-out is fewer moving parts.

### Tasks

- [x] Decision: **SDK** (`@anthropic-ai/claude-agent-sdk`) — beats `claude -p` because SDK respects any token passed; `claude -p` has the unrefreshed-token bug
- [x] Rewrite `POST /api/chat` against the SDK; stream chunks back as SSE
- [x] Pass NPC `.md` body content as `options.systemPrompt`
- [x] Per-NPC conversation memory via SDK `resume: <session_id>` in `Map<agentId, sessionId>`
- [x] Add `package.json` `"bin": { "claude-village": "./server.ts" }` + `#!/usr/bin/env bun` shebang + `chmod +x` — kept for local `bun link` even though we won't publish
- [x] After server boots, auto-open default browser (`open` / `xdg-open` / `start` per platform); `CLAUDE_VILLAGE_NO_OPEN=1` to disable
- [x] Browser-side chat panel: right sidebar, **E** opens nearest-NPC chat, **Esc** closes, per-NPC history kept client-side, SSE streaming render, reset button
- [x] `POST /api/chat/reset` endpoint — clears the per-NPC SDK session id on demand so the next chat starts a fresh thread (paired with the chat panel's reset button)
- [ ] Replace `ANTHROPIC_API_KEY` requirement: after June 15, 2026 — remove env check, document `claude setup-token` long-lived OAuth path. Also pass the long-lived token to the SDK explicitly so it never reuses the parent Claude Code session's short-lived OAuth (see "Auth verification" below).
- [x] Update `README.md`: prereqs, run command, dual auth paths

### Distribution model (locked: clone-only, no npm publish)

Users do:

```bash
git clone <repo>
cd subagents-rpg-world
bun install
bun start                # or `bun link` once, then `claude-village` from anywhere
```

No `npm publish`, no `bunx`. Means: no build artifacts in the repo, no minification, no version-bump dance. The cost of editing source is the cost of pulling.

### Dual auth modes (transition period)

| Mode                     | When                                   | Setup                                                                                                                                               |
| ------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Now → June 14, 2026**  | Pay-as-you-go via existing API credits | Set `ANTHROPIC_API_KEY` in env; SDK uses it. User's $10 credit balance covers casual use                                                            |
| **June 15, 2026 onward** | Pro plan included quota                | Unset `ANTHROPIC_API_KEY`; run `claude setup-token` once; SDK uses the long-lived OAuth token. Zero collision with interactive Claude Code sessions |

Same code path either way — SDK auth precedence handles the switch automatically.

### Why this is worth doing

- Anyone with Claude Code installed can run it — no separate account, no separate bill
- The RPG layer adds discoverability: subagents stop being a folder of `.md` files and become _places you walk into and ask questions of_
- Subagent personas stay version-controlled in `subagents/` — drop a new `.md`, refresh, new NPC appears

### Risks / unknowns

- ~~Whether the SDK / `claude -p` cleanly streams _while a Claude Code session is already running_~~ — **verified: there IS a collision risk today**, see "Auth verification" below.
- Per-NPC conversation persistence semantics depend on which mechanism wins above.

### Auth verification (researched 2026-05-19)

**Verdict: no API key needed, but naive auth WILL interfere with the user's interactive Claude Code session. Use a long-lived token to isolate.**

What's good:

- Post **2026-06-15**, the Agent SDK + `claude -p` run on the user's Pro/Max plan directly — no `ANTHROPIC_API_KEY`, no second billing path.
- Pro plan: $20/month of Agent SDK credit. Max 20×: $200/month. **Separate budget** from interactive Claude Code usage, so claude-village chat won't eat into the user's coding quota.
- SDK is a wrapper around the Claude Code CLI — same OAuth login is reused transparently.

What's broken if we don't isolate:

- Multiple concurrent Claude Code processes (interactive session + SDK calls from `server.ts`) all try to refresh the **same OAuth access token** (~8h expiry) using rotating refresh tokens. Only one refresh succeeds — every other session gets invalidated. Open issues: [anthropics/claude-code#48786](https://github.com/anthropics/claude-code/issues/48786), [#24317](https://github.com/anthropics/claude-code/issues/24317), [#54179](https://github.com/anthropics/claude-code/issues/54179).
- `claude -p` non-interactive doesn't refresh tokens at all → 401 after ~10–15 min ([#28827](https://github.com/anthropics/claude-code/issues/28827)).
- Result if ignored: the user's main Claude Code session randomly demands re-login while playing the village. Unacceptable.

The fix (must do this before shipping Phase 7):

- Document a one-time setup: `claude setup-token` generates a **1-year OAuth token** scoped for automation.
- `server.ts` reads that token from a config file (e.g. `~/.config/claude-village/token` or env var `CLAUDE_VILLAGE_TOKEN`) and passes it to the SDK / shell call.
- Long-lived token ≠ parent session's short-lived OAuth flow → no race, no shared refresh path, no kicked-out interactive session.
- Setup story: README says "first run: `claude setup-token` and paste the output when prompted." Token is reused thereafter.

Decision implication: this **pushes the SDK option ahead of `claude -p`**, because `claude -p` has the unrefreshed-token bug on top of the shared-refresh problem. SDK respects whatever token is provided.

### Sources

- [Use the Claude Agent SDK with your Claude plan — Anthropic support](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [Authentication — Claude Code docs](https://code.claude.com/docs/en/authentication)
- [Run Claude Code programmatically — Claude Code docs](https://code.claude.com/docs/en/headless)
- [Agent SDK Dual-Bucket Billing: What Changes June 15, 2026](https://tygartmedia.com/claude-agent-sdk-dual-bucket-billing-june-2026/)
- [How to Use the Claude Agent SDK With Your Claude Plan? — apidog](https://apidog.com/blog/claude-agent-sdk-with-claude-plan-setup-guide/)

## Frontend file split + Tailwind (shipped between Phase 7 and Phase 8)

- [x] Extract game logic out of `public/index.html` into its own file (`public/game.js`, later `public/game.ts`)
- [x] Replace inline CSS with **Tailwind via Play CDN** (single `<script src="https://cdn.tailwindcss.com">`). All non-dynamic styling lives in markup classes; dynamic chat-message styling is computed from a tiny `MSG_VARIANT` map in TS
- [x] Tiny `<style>` block kept in `index.html` for `canvas { image-rendering: pixelated }` — Tailwind has no utility for it
- [x] `index.html` is now a thin shell: HTML scaffolding, Tailwind classes, two script tags (Tailwind CDN + `/game.js`)
- [x] Helper fns (`showChat`/`hideChat`/`showNearby`/`hideNearby`) swap Tailwind `hidden`/`flex` classes instead of inline `style.display`

## Phase 9 — Seamless invocation from any Claude Code session

Goal: `/village` from inside any project, in any Claude Code session, opens the village in your browser. `/village-stop` kills it. No second terminal, no `cd` into this repo, no manual `bun start`.

### Setup story (one-time, ~30 seconds)

```bash
cd path/to/subagents-rpg-world
bun link                                                       # makes `claude-village` global in $PATH
mkdir -p ~/.claude/commands
ln -s "$(pwd)/.claude/commands/village.md"      ~/.claude/commands/village.md
ln -s "$(pwd)/.claude/commands/village-stop.md" ~/.claude/commands/village-stop.md
```

### Daily flow (zero friction after setup)

```
(inside Claude Code, any project, any terminal)

/village          # boots server, opens browser, backgrounded
/village-stop     # kills the process on :3000
```

### Tasks

- [x] **Portable paths in `server.ts`**: resolve `subagents/`, `skills/`, `public/` relative to `import.meta.dir`. Verified via `cd /tmp && PORT=3099 bun <abs path>/server.ts` — agents/skills/`/game.js` all served correctly.
- [x] Create `.claude/commands/village.md` — backgrounded `nohup claude-village ... &` launch; guards against port-already-in-use.
- [x] Create `.claude/commands/village-stop.md` — kills the pid on :3000, or reports "village not running".
- [x] README: "Seamless install" section with `bun link` + symlink steps.
- [x] CLAUDE.md: mentions `.claude/commands/` slash command files exist and are meant to be symlinked into `~/.claude/commands/` per developer.
- [x] End-to-end test (2026-05-19): `bun link` registered `claude-village` at `~/.bun/bin/claude-village`; symlinked `~/.claude/commands/village.md` + `village-stop.md` → repo copies. Verified from `cd /tmp` that `claude-village` serves 33 agents + 2 skills (portable paths intact). `village.md` snippet cold-starts cleanly, hits `lsof` guard on second run; `village-stop.md` kills the pid and frees :3000. Slash command from a sibling Claude Code session still requires user to type `/village` to confirm UX end-to-end, but every shell-level mechanic is green.

### Trade-offs accepted

- Slash command symlinks must point at the repo on disk — if you move the repo, re-link. Acceptable for a clone-and-run tool.
- `bun link` is per-machine. New machine = re-link. Documented in README.
- Logs go to `/tmp/claude-village.log` instead of stdout. Tail it when debugging; ignore during play.
- One global village process at a time (single port 3000). Fine — there's only one of you.

### Why not the alternatives

- **Second terminal:** alt-tab friction. Rejected.
- **`! claude-village &` inline:** strictly inferior to a slash command — same shell call, less discoverable, undocumented in `/help`.
- **Project-local slash commands only** (`./.claude/commands/`): only works inside this repo. Defeats "from any project."

## Phase 8 — TypeScript on the client (Path B: on-the-fly transpile)

Goal: get types around `game.js` without adding a build artifact or losing the save → refresh dev loop.

Decision: **Bun.Transpiler in `server.ts`**, transpile `public/game.ts` on each `/game.js` request. Browser still loads `/game.js`. No bundler, no `dist/`, no module split (yet).

- [x] Rename `public/game.js` → `public/game.ts`
- [x] Add minimal types: `Agent`, `Skill`, `Npc`, `Building`, `Interior`, `SpriteEntry`, `Vec2`, `Rect`, `Door`, `Table`, `SkillItem`, `Decoration`, `Player`, `Scene`, `ChatMessage`, `MsgVariant`. Re-declared client-side (no shared types file — modules still off)
- [x] In `server.ts`, added a `GET /game.js` route reading `./public/game.ts`, transpiling via `Bun.Transpiler({ loader: "ts", target: "browser" })`. Caches by `BunFile.lastModified` so edits hot-reload.
- [x] Route order: `/game.js` registers before the catch-all `/*` static handler
- [x] Smoke test: html 200, game.js 200 with `application/javascript` ctype + 24.4 KB body, agents/skills/404 paths all correct
- [x] CLAUDE.md: note "client is `game.ts`; transpiled on the fly by server"

Trade-offs accepted:

- ~15 ms transpile per first hit (then cached by browser). Imperceptible.
- No tree-shaking / minification. We don't ship a tarball, so we don't care.
- Single file stays — only split into modules if it crosses ~1000 lines.

## World sizing (smaller — see /plan "make-the-world-smaller")

- [x] First pass: 24×24 tiles, ringR 520, drop pond
- [x] Confirmed: at 24×24 the building ring still overflowed 1280×800. Final values below.
- [x] Final tight fit for 1280×800: **20×12 tiles (1280×768 px)**, ringR **230**, building sprites scaled down (~170w × 140h, db 180×150, skills 160×120), door zones 44×18, decoration band 110–230, plaza radius 1.6 tiles. Village fits with **0 scrolling** on a 1280×800 viewport; world auto-centers on larger viewports.
- [x] Reversed 2026-05-19 — buildings on the 230-radius ring were touching shoulder-to-shoulder (circumference per slot ≈ building width). Bumped to **28×18 tiles (1792×1152 px)**, ringR **340**, decoration band **120–320**, decoration count **90**, tree probability **0.30** (was 0.55) so the forest doesn't choke the plaza. Added render `ZOOM = 1.6` and removed the floating building name-banner. Camera scrolls; auto-center branch still handles viewports larger than the world. Per-slot gap ~90 px.

## Open questions

- Should agent home positions be user-configurable (frontmatter `x`, `z` fields)?
- Should skills appear as items the player "equips" to boost agent responses?
- When `game.ts` grows past ~1000 lines, split into modules + `bun build` step, or stay single-file?
- Per-agent NPC sprites: invent a sprite-key convention (`npc_<id>.png` falling back to `npc_default.png`)?
- Persist chat history across page refresh (localStorage), or keep it session-only?

---

## Notes for Claude Code

- Test endpoints with `curl` before touching the frontend
- Agent positions: deterministic — sort agents by `id` then place by index around their table / building center
- Keep canvas / game setup modular inside `public/game.ts` — use clearly named `function generateMap()`, `function buildInterior()`, `function placeBuilding()` etc.
- Server deps live in `package.json`: `hono` + `@anthropic-ai/claude-agent-sdk`. Any further deps need explicit user approval. Agent/skill files have no YAML frontmatter — `gray-matter` is **not** used; H1 + first paragraph parsing lives in `server.ts`.
- If `./subagents/` is missing or empty, return `[]` gracefully rather than throwing
- **Bun gotcha:** `Bun.file()` does **not** have a `.stat()` method. Use `BunFile.lastModified` (number, epoch ms) for mtime-based cache invalidation. We learned this when wiring the `/game.js` transpile route.
- **Bg-isolation:** for background Claude Code sessions in this repo, `.claude/settings.json` carries `{ "worktree": { "bgIsolation": "none" } }` so edits land in the shared checkout. Don't remove unless you intentionally want bg sessions to clone into a separate worktree.
- **Type sharing:** Client types live in `public/src/types.ts`. Server keeps its own `Agent`/`Skill` definitions in `server.ts` — they're hand-synced. If a third surface ever needs them, extract to a top-level `types.ts` and import from both sides.
- **Chat panel hide/show:** toggle Tailwind `hidden` ↔ `flex` classes; do not assign `style.display` directly. Helpers `showChat`/`hideChat`/`showNearby`/`hideNearby` already exist — use those.
