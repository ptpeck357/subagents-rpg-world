# Claude Village

A 2D top-down (3/4 oblique, Lords of Xulima–style) RPG world where Claude Code subagents are NPCs you can walk up to. Built with Bun + Hono (server) and vanilla HTML5 Canvas 2D (client) — no framework, no build step.

## Project layout

```
claude-village/
├── server.ts          # Bun + Hono API server (file scanner + Anthropic proxy)
├── public/
│   ├── index.html     # 2D canvas game (single file, no build step)
│   └── sprites/       # Drop PNG sprites here (filename = sprite key, e.g. building_api.png)
├── subagents/         # Local agent source (dir-per-category, .md per agent)
├── skills/            # Local skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md
└── planner.md         # See @planner.md for active task tracking
```

## Stack

- **Runtime**: Bun (not Node)
- **Server**: Hono — keep it minimal, no extra middleware
- **Frontend**: Vanilla JS + HTML5 Canvas 2D, no framework, no bundler, no CDN deps
- **Language**: TypeScript on the server, plain JS in the HTML file
- **Art**: PNGs in `public/sprites/`; engine falls back to colored placeholder rects when a sprite file is absent

## Commands

```bash
bun start                  # start dev server with --watch on :3000
bun run server.ts          # bare invocation (no watch)
```

Server runs on `http://localhost:3000`. Set `ANTHROPIC_API_KEY` in `.env` for chat.

## API surface

| Method | Endpoint | Source / Behavior |
|---|---|---|
| `GET` | `/api/agents` | Recursive scan of `./subagents/**/*.md`, returns parsed agents with category/subcategory |
| `GET` | `/api/skills` | Recursive scan of `./skills/**/SKILL.md`, returns parsed skills |
| `POST` | `/api/chat` | Proxies `{system, messages, model?}` to `https://api.anthropic.com/v1/messages` using server-side `ANTHROPIC_API_KEY` |
| `GET` | `/*` | Static serve from `./public/` |

**Do not add other endpoints.** The chat proxy exists so the API key never lives in the browser.

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
- Keep `server.ts` lean (~120 line ceiling); if it grows beyond that, something is wrong
- The HTML file is self-contained — only the three `/api/*` endpoints from this server
- All 2D rendering and game logic lives in `public/index.html`
- Sprites: PNG files in `public/sprites/`, anchored bottom-center, drawn with painter's-algorithm sort by Y

## Village layout

The world reflects the directory tree under `subagents/`:

- **Each top-level dir is a building** named after the dir (e.g. `payments/` → "PAYMENTS" building)
- **Each second-level dir is a table** placed in the yard in front of that building (e.g. `database/mysql/` → "mysql" table in front of the DATABASE building)
- **Each `.md` agent file is an NPC** clustering around its table (or the building yard if no nested subdir)
- **Skills live in a dedicated "Skill Hut"** 8th building with skill items lined up out front

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
- Do not add a build step, bundler, or package.json scripts beyond `start`
- Do not read from `~/.claude/` — sources are the local `subagents/` and `skills/` dirs in this repo
- Do not modify anything outside `server.ts` and `public/` when working on features
