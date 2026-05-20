# Claude Village

A 2D top-down (3/4 oblique, Lords of Xulima–style) RPG world where Claude Code subagents are NPCs you can walk up to. Built with Bun + Hono on the server and HTML5 Canvas 2D on the client. Ships as a CLI tool (`claude-village`).

## Project layout

```
claude-village/
├── server.ts          # Bun + Hono API server (file scanner + Agent SDK chat) + CLI bin
├── public/
│   ├── index.html     # HTML shell — Tailwind classes, DOM scaffolding, loads /game.js
│   ├── game.ts        # All canvas rendering, world gen, chat panel logic (TypeScript)
│   └── sprites/       # Drop PNG sprites here (filename = sprite key, e.g. building_api.png)
├── subagents/         # Local agent source (dir-per-category, .md per agent)
├── skills/            # Local skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md
└── planner.md         # See @planner.md for active task tracking
```

## Stack

- **Runtime**: Bun (not Node)
- **Server**: Hono — keep it minimal, no extra middleware
- **Chat**: `@anthropic-ai/claude-agent-sdk` — `query()` streams via SSE; no direct Anthropic fetch
- **Frontend**: HTML5 Canvas 2D, no framework. Bun's bundler (`bun build`) is available; use it when modules / TypeScript on the client buy real value, skip it when raw JS still fits.
- **Styling**: Tailwind via Play CDN. Other CDN scripts are fine when they pull their weight — prefer well-known libraries over hand-rolling.
- **Language**: TypeScript on both sides. `public/game.ts` is transpiled on the fly by `server.ts` via `Bun.Transpiler` and served as `/game.js` to the browser. Edit `.ts`, refresh, done.
- **Art**: PNGs in `public/sprites/`; engine falls back to colored placeholder rects when a sprite file is absent

## Commands

```bash
bun start                  # start dev server with --watch on :3000, auto-opens browser
bun run server.ts          # bare invocation (no watch)
claude-village             # once linked/published via the bin entry
```

Server runs on `http://localhost:3000` and auto-opens the user's default browser. Set `CLAUDE_VILLAGE_NO_OPEN=1` to suppress.

Auth for chat: SDK picks whatever is available. Before 2026-06-15, set `ANTHROPIC_API_KEY` in `.env` (pay-as-you-go). After 2026-06-15, run `claude setup-token` once for a long-lived OAuth token that draws from Pro/Max plan credit and **does not** race-refresh with the user's interactive Claude Code session. See `planner.md` Phase 7 "Auth verification".

## API surface

| Method | Endpoint | Source / Behavior |
|---|---|---|
| `GET` | `/api/agents` | Recursive scan of `./subagents/**/*.md`, returns parsed agents with category/subcategory |
| `GET` | `/api/skills` | Recursive scan of `./skills/**/SKILL.md`, returns parsed skills |
| `POST` | `/api/chat` | Runs Agent SDK `query()` with `{agentId, system, message}`; streams chunks back as SSE (`data: {"type":"chunk","text":...}`). Maintains per-NPC SDK session resume keyed by `agentId` in an in-memory Map. Before the SDK call, `relevantSkills()` keyword-matches loaded skills against the agent's `system` text and appends matches under a `# Relevant skills` heading. |
| `POST` | `/api/chat/reset` | Deletes the cached session id for an `agentId` so the next chat starts a fresh thread. |
| `GET` | `/*` | Static serve from `./public/` |

**Do not add other endpoints.** The SDK call exists server-side so the API key / OAuth token never lives in the browser.

## Agent / skill shape

Files have **no YAML frontmatter**. Parser uses `# H1` as `name` and the first non-heading paragraph as `description`. Returned shape:

```ts
type Agent = {
  id: string           // path stem, e.g. "database/supabase/rls-reviewer"
  name: string         // H1 title
  description: string  // first paragraph, ~160 char cap
  content: string      // raw markdown body (used as chat system prompt)
  category: string     // top-level dir, e.g. "database"
  subcategory?: string // second-level dir if present, e.g. "supabase"
}

type Skill = {
  id: string           // dir name, e.g. "secret-scan"
  name: string
  description: string
  content: string
}
```

## Conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- No `npm` — use `bun add` / `bun remove`
- Keep `server.ts` lean (~160 line ceiling now that SDK chat + CLI live there); if it grows past that, something is wrong
- `public/index.html` stays a thin shell — markup, Tailwind classes, two script tags (Tailwind + game.js). Don't put game logic in here.
- Client code owns: canvas rendering, world generation, NPC wander, scene transitions, chat panel wiring. Split into modules + TypeScript when a file gets unwieldy; keep `public/index.html` as the entry shell either way.
- Style with **Tailwind utility classes in markup**, not custom CSS. The tiny `<style>` block in `index.html` is reserved for things Tailwind can't express (e.g. `image-rendering: pixelated` on canvas).
- Sprites: PNG files in `public/sprites/`, anchored bottom-center, drawn with painter's-algorithm sort by Y

## Village layout

The world reflects the directory tree under `subagents/`:

- **Each top-level dir is a building** named after the dir (e.g. `payments/` → "PAYMENTS" building)
- **Each second-level dir is a table** placed in the yard in front of that building (e.g. `database/mysql/` → "mysql" table in front of the DATABASE building)
- **Each `.md` agent file is an NPC** clustering around its table (or the building yard if no nested subdir)
- **Skills live in a dedicated "Skill Hut"** 8th building with skill items lined up out front. Walk near one and press **E** → a modal renders the skill's `content` field. **Esc** or click-outside closes. Movement freezes while modal is open.

Buildings arrange evenly in a ring around a central plaza. NPC home positions are deterministic — agents sorted by `id` then placed by index, so reruns produce the same layout.

## Agent character system

- `name` (parsed H1) → label above NPC when nearest to player
- `description` (first paragraph) → role subtitle shown in the bottom proximity bubble
- `content` (full markdown) → system prompt for `/api/chat`
- NPCs idle-wander in a small radius around their home position

## Sprite naming

The engine looks for `/sprites/<key>.png`. Current keys it tries to load:

- `building_<category>` (e.g. `building_payments.png`, `building_database.png`) and `building_skills`
- `npc_default` — fallback for every agent (per-agent sprites optional later)
- `player`
- `tree`, `rock`, `flower`, `table`, `skill_item`

Anchor each PNG at bottom-center. Recommended sizes match the placeholder dimensions in `defineSprite()` calls. Missing PNGs render as labeled colored rects so the game stays playable while art is in flight.

## What NOT to do

- Do not add a database, cache layer, or any persistent storage
- Do not put `ANTHROPIC_API_KEY` in the browser — it stays server-side (proxy via `/api/chat`)
- Package.json scripts beyond `start` are fine when they pay for themselves (`build`, `publish`, etc.)
- Do not read from `~/.claude/` — sources are the local `subagents/` and `skills/` dirs in this repo
- Do not modify anything outside `server.ts` and `public/` when working on features
