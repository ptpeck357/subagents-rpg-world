# Claude Village

A 2D top-down (3/4 oblique, Lords of Xulima–style) RPG world where Claude Code subagents are NPCs you can walk up to. Built with Bun + Hono on the server and HTML5 Canvas 2D on the client. Ships as a CLI tool (`claude-village`).

## Project layout

```
claude-village/
├── server.ts          # Bun + Hono API server (file scanner + Agent SDK chat) + CLI bin
├── public/
│   ├── index.html     # HTML shell — Tailwind classes, DOM scaffolding, <script type="module" src="/game.js">
│   ├── src/
│   │   ├── types.ts   # Shared TypeScript types (Agent, Building, Interior, etc.)
│   │   ├── world.ts   # Constants, sprite table, tilemap, world layout, collision, layoutWorld()
│   │   ├── render.ts  # Canvas drawing: drawSprite, renderVillage, renderInterior, helpers
│   │   └── main.ts    # Bootstrap: data fetch, player/scene state, input, chat panel, game loop
│   └── sprites/       # Drop PNG sprites here (filename = sprite key, e.g. building_api.png)
├── scripts/
│   ├── gen-sprites.ts # Thin entrypoint: iterates recipes, writes PNGs
│   └── sprite/        # Procedural sprite generator modules
│       ├── png.ts        # Pure-TS PNG encoder (node:zlib)
│       ├── canvas.ts     # RGBA + pixel-buffer Canvas + primitives
│       ├── palette.ts    # Shared LoX color palette
│       ├── buildings.ts  # drawBuilding + STYLES/EMBLEMS/ROOF_PROPS tables + buildingSpecs
│       ├── characters.ts # drawHumanoid + Facing + PLAYER_LOOK/NPC_LOOK
│       ├── props.ts      # tree/rock/flower/table/bookshelf/rug/lamp/plant/crate/skill_item
│       └── recipes.ts    # Assembles the sprite map from the data tables above
├── subagents/         # Local agent source (dir-per-category, .md per agent)
├── skills/            # Local skill source (dir-per-skill, SKILL.md inside)
├── .claude/commands/  # /village + /village-stop slash commands (symlink into ~/.claude/commands/)
├── eslint.config.js   # Flat ESLint config (typescript-eslint, server.ts → node, public → browser)
├── .prettierrc.json   # Prettier config
├── CLAUDE.md
└── planner.md         # See @planner.md for active task tracking
```

Server resolves `subagents/`, `skills/`, and `public/` relative to `import.meta.dir`, so `claude-village` (after `bun link`) always reads **this** repo's content regardless of the cwd it was invoked from.

## Slash commands

`.claude/commands/village.md` and `village-stop.md` ship in the repo. They're per-developer: each user symlinks them into `~/.claude/commands/` once so `/village` and `/village-stop` work from any Claude Code session. Setup steps live in README "Seamless install".

## Stack

- **Runtime**: Bun (not Node)
- **Server**: Hono — keep it minimal, no extra middleware
- **Chat**: `@anthropic-ai/claude-agent-sdk` — `query()` streams via SSE; no direct Anthropic fetch
- **Frontend**: HTML5 Canvas 2D, no framework. Client is split into ES modules under `public/src/` and bundled into `/game.js` by `Bun.build({ format: 'esm' })` on demand. `index.html` loads it via `<script type="module">`.
- **Styling**: Tailwind via Play CDN. Other CDN scripts are fine when they pull their weight — prefer well-known libraries over hand-rolling.
- **Language**: TypeScript on both sides. `server.ts` bundles `public/src/main.ts` → `/game.js` per request, cached by max mtime across `public/src/*.ts`. Edit any module, refresh, done.
- **Tooling**: `bun run lint` (eslint flat config + typescript-eslint), `bun run lint:fix`, `bun run format` (prettier), `bun run format:check`.
- **Art**: PNGs in `public/sprites/`; engine falls back to colored placeholder rects when a sprite file is absent

## Commands

```bash
bun start                  # start dev server with --watch on :3000, auto-opens browser
bun run server.ts          # bare invocation (no watch)
bun run sprites            # regenerate public/sprites/*.png from scripts/gen-sprites.ts
claude-village             # once linked/published via the bin entry
```

Server runs on `http://localhost:3000` and auto-opens the user's default browser. Set `CLAUDE_VILLAGE_NO_OPEN=1` to suppress.

Auth for chat: SDK picks whatever is available. Before 2026-06-15, set `ANTHROPIC_API_KEY` in `.env` (pay-as-you-go). After 2026-06-15, run `claude setup-token` once for a long-lived OAuth token that draws from Pro/Max plan credit and **does not** race-refresh with the user's interactive Claude Code session. See `planner.md` Phase 7 "Auth verification".

## API surface

| Method | Endpoint          | Source / Behavior                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/agents`     | Recursive scan of `./subagents/**/*.md`, returns parsed agents with category/subcategory                                                                                                                                                                                                                                                                                    |
| `GET`  | `/api/skills`     | Recursive scan of `./skills/**/SKILL.md`, returns parsed skills                                                                                                                                                                                                                                                                                                             |
| `POST` | `/api/chat`       | Runs Agent SDK `query()` with `{agentId, system, message}`; streams chunks back as SSE (`data: {"type":"chunk","text":...}`). Maintains per-NPC SDK session resume keyed by `agentId` in an in-memory Map. Before the SDK call, `relevantSkills()` keyword-matches loaded skills against the agent's `system` text and appends matches under a `# Relevant skills` heading. |
| `POST` | `/api/chat/reset` | Deletes the cached session id for an `agentId` so the next chat starts a fresh thread.                                                                                                                                                                                                                                                                                      |
| `GET`  | `/*`              | Static serve from `./public/`                                                                                                                                                                                                                                                                                                                                               |

**Do not add other endpoints.** The SDK call exists server-side so the API key / OAuth token never lives in the browser.

## Agent / skill shape

Files have **no YAML frontmatter**. Parser uses `# H1` as `name` and the first non-heading paragraph as `description`. Returned shape:

```ts
type Agent = {
    id: string; // path stem, e.g. "database/supabase/rls-reviewer"
    name: string; // H1 title
    description: string; // first paragraph, ~160 char cap
    content: string; // raw markdown body (used as chat system prompt)
    category: string; // top-level dir, e.g. "database"
    subcategory?: string; // second-level dir if present, e.g. "supabase"
};

type Skill = {
    id: string; // dir name, e.g. "secret-scan"
    name: string;
    description: string;
    content: string;
};
```

## Conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- No `npm` — use `bun add` / `bun remove`
- Keep `server.ts` lean (~230 line ceiling now that SDK chat + CLI + dir guards + the bundle route live there); if it grows past that, something is wrong
- Client modules (`public/src/`) are individually small — keep them that way. If `world.ts` or `render.ts` crosses ~500 lines, split (e.g. break `sprites` or `interior` out)
- `public/index.html` stays a thin shell — markup, Tailwind classes, two script tags (Tailwind + the module entry). Don't put game logic in here.
- Client code is split across `public/src/{types,world,render,main}.ts`. Keep the module boundaries: `types.ts` exports only types; `world.ts` owns world state + collision + layout (no canvas); `render.ts` owns everything that touches `ctx`; `main.ts` is the entry point and owns player/scene/chat state.
- Style with **Tailwind utility classes in markup**, not custom CSS. The tiny `<style>` block in `index.html` is reserved for things Tailwind can't express (e.g. `image-rendering: pixelated` on canvas).
- Sprites: PNG files in `public/sprites/`, anchored bottom-center, drawn with painter's-algorithm sort by Y

## Village layout

The world reflects the directory tree under `subagents/`:

- **Each top-level dir is a building** named after the dir (e.g. `payments/` → "PAYMENTS" building)
- **Each second-level dir is a table** placed in the yard in front of that building (e.g. `database/mysql/` → "mysql" table in front of the DATABASE building)
- **Each `.md` agent file is an NPC** clustering around its table (or the building yard if no nested subdir)
- **Skills live in a dedicated "Skill Hut"** 8th building with skill items lined up out front. Walk near one and press **E** → a modal renders the skill's `content` field. **Esc** or click-outside closes. Movement freezes while modal is open.

Buildings are arranged in a **single row across the north edge of the map**, all doors facing south at the player (and matching the painted door on the building sprite). NPC home positions are deterministic — agents sorted by `id`, placed by index. The path layout is a T-shape: per-building stub paths run south from each door to a horizontal **main street** tile strip; the plaza connects to the street via a single vertical artery. The player spawns at the plaza.

`southDoor(bx, by, spriteW)` builds each `DoorPlacement`. Because the painted door inside `scripts/sprite/buildings.ts:drawDoor` lives on the front face — which is offset left of the sprite anchor (the right portion is the 3/4-oblique side recede) — `southDoor` mirrors that offset (`4 + floor(spriteW * 0.72 / 2) - spriteW/2`, about −22 px on a 180-wide sprite). Result: the entry rect, the painted door, and the path tile all land at the same world-space column. Do **not** re-introduce the old N/S/E/W `pickDoor()` selector unless you also generate sprite variants with the door on the matching face.

## Agent character system

- `name` (parsed H1) → label above NPC when nearest to player
- `description` (first paragraph) → role subtitle shown in the bottom proximity bubble
- `content` (full markdown) → system prompt for `/api/chat`
- NPCs idle-wander in a small radius around their home position

## Sprite naming

The engine looks for `/sprites/<key>.png`. Current keys it tries to load:

- `building_<category>` (e.g. `building_payments.png`, `building_database.png`) and `building_skills`
- `npc_default` — fallback for every agent (per-agent sprites optional later)
- `player` (south) + `player_n` / `player_e` / `player_w` — `render.ts` picks via `playerSpriteKey(player.facing)`
- World decor: `tree`, `rock`, `flower`
- Interior decor: `table`, `skill_item`, `bookshelf`, `rug`, `lamp`, `plant`, `crate`

Anchor each PNG at bottom-center. Recommended sizes match the placeholder dimensions in `defineSprite()` calls. Missing PNGs render as colored rects — pass `null` as the `label` arg to `defineSprite()` if you want the placeholder to render without any text overlay (otherwise the label string is drawn on top, e.g. "DATABASE" for `building_database`).

The full atlas is generated procedurally by `bun run sprites` (entrypoint `scripts/gen-sprites.ts`, modules under `scripts/sprite/`). Pure-TS PNG encoder built on `node:zlib` — no image-lib deps. To add a sprite:

- **Building**: add one line to `buildingSpecs` in `scripts/sprite/buildings.ts` + a matching `defineSprite('building_<name>', …)` in `public/src/world.ts`. Style (wall/door/trim palette), roof color, optional emblem / roof prop / `roofKind` ('peaked' | 'clay' | 'thatched') / `columns` all come from the spec table.
- **Prop**: add a `draw<Name>(c: Canvas)` function and one line to `props` in `scripts/sprite/props.ts`, plus the `defineSprite()` entry in `world.ts`.
- **Character variant**: extend `characters[]` in `scripts/sprite/recipes.ts` with a new `keyBase` + `look` + optional `facings` list (defaults to `['south']`).

## What NOT to do

- Do not add a database, cache layer, or any persistent storage
- Do not put `ANTHROPIC_API_KEY` in the browser — it stays server-side (proxy via `/api/chat`)
- Package.json scripts beyond `start` are fine when they pay for themselves (`build`, `publish`, etc.)
- Do not read from `~/.claude/` — sources are the local `subagents/` and `skills/` dirs in this repo
- Do not modify anything outside `server.ts`, `public/`, and `.claude/commands/` when working on features (docs `CLAUDE.md` / `README.md` / `planner.md` are the usual exceptions)
