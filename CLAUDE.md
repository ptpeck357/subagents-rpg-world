# Claude Village

A 2D top-down (3/4 oblique, Lords of Xulima–style) RPG world where Claude Code subagents are NPCs you can walk up to. Built with Bun + Hono (server) and vanilla HTML5 Canvas 2D (client) — no framework, no build step.

## Project layout

```
claude-village/
├── server.ts          # Bun + Hono API server (file scanner + Agent SDK chat) + CLI bin
├── public/
│   ├── index.html     # 2D canvas game with chat panel (single file, no build step)
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
- **Frontend**: Vanilla JS + HTML5 Canvas 2D, no framework, no bundler, no CDN deps
- **Language**: TypeScript on the server, plain JS in the HTML file
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
| `POST` | `/api/chat` | Runs Agent SDK `query()` with `{agentId, system, message}`; streams chunks back as SSE (`data: {"type":"chunk","text":...}`). Maintains per-NPC SDK session resume keyed by `agentId` in an in-memory Map. |
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
- The HTML file is self-contained — only the `/api/*` endpoints from this server
- All 2D rendering and game logic lives in `public/index.html`
- Sprites: PNG files in `public/sprites/`, anchored bottom-center, drawn with painter's-algorithm sort by Y

## Village layout

The world reflects the directory tree under `subagents/`:

- **Each top-level dir is a building** named after the dir (e.g. `payments/` → "PAYMENTS" building) standing in a ring around a central plaza
- **NPCs are hidden in the village view** — buildings show their door, that's it
- **Walking into a building's door zone switches to an interior scene**: wood-plank floor, walls, exit door at the bottom
- **Inside the interior**, each second-level dir becomes a **labeled table** (e.g. `database/mysql/` → "mysql" table inside the DATABASE building); NPCs cluster around their table
- **Skills live in a dedicated "Skill Hut"** 8th building; entering shows the skill items as shelf icons

World is sized to fit a 1280×800 viewport without scrolling on a typical laptop monitor. Buildings + NPC home positions are deterministic (agents sorted by `id`).

## Agent character system

- `name` (parsed H1) → label above NPC when nearest to player + chat panel header
- `description` (first paragraph) → role subtitle shown in the bottom proximity bubble + chat panel subheader
- `content` (full markdown) → `options.systemPrompt` passed to the Agent SDK on every chat turn
- NPCs idle-wander in a small radius around their home position
- Press **E** when proximity bubble is visible to open the chat panel; **Esc** to close; world pauses while chat is open

## Sprite naming

The engine looks for `/sprites/<key>.png`. Current keys it tries to load:

- `building_<category>` (e.g. `building_payments.png`, `building_database.png`) and `building_skills`
- `npc_default` — fallback for every agent (per-agent sprites optional later)
- `player`
- `tree`, `rock`, `flower`, `table`, `skill_item`

Anchor each PNG at bottom-center. Recommended sizes match the placeholder dimensions in `defineSprite()` calls. Missing PNGs render as labeled colored rects so the game stays playable while art is in flight.

## What NOT to do

- Do not add a database, cache layer, or any persistent storage
- Do not put `ANTHROPIC_API_KEY` (or any OAuth token) in the browser — it stays server-side; the SDK is only called from `server.ts`
- Do not call Anthropic's REST API directly — always go through `@anthropic-ai/claude-agent-sdk`'s `query()` so the same code path works for both API-key and OAuth-token auth
- Do not add a build step, bundler, or package.json scripts beyond `start`
- Do not read from `~/.claude/` — sources are the local `subagents/` and `skills/` dirs in this repo
- Do not modify anything outside `server.ts` and `public/` when working on features
