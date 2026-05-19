# Claude Village

A 3D cozy RPG world where Claude Code subagents are playable NPC characters. Built with Bun + Hono (server) and Three.js (client).

## Project layout

```
claude-village/
├── server.ts          # Bun + Hono API server (file scanner + Anthropic proxy)
├── public/
│   └── index.html     # Three.js game (single file, no build step)
├── subagents/         # Local agent source (dir-per-category, .md per agent)
├── skills/            # Local skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md
└── planner.md         # See @planner.md for active task tracking
```

## Stack

- **Runtime**: Bun (not Node)
- **Server**: Hono — keep it minimal, no extra middleware
- **Frontend**: Vanilla JS + Three.js r128 via CDN, no framework, no bundler
- **Language**: TypeScript on the server, plain JS in the HTML file

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
- Three.js scene logic lives entirely in `public/index.html`

## Village layout

The world reflects the directory tree under `subagents/`:

- **Each top-level dir is a building** named after the dir (e.g. `payments/` → "PAYMENTS" building)
- **Each second-level dir is a table inside that building** (e.g. `database/mysql/` → "mysql" table inside the DATABASE building)
- **Each `.md` agent file is an NPC** sitting/wandering near its table (or building center if no nested subdir)
- **Skills live in a dedicated "Skill Hut"** 8th building, one item per skill on shelves

Buildings arrange evenly in a ring around a central plaza. NPC seat positions are deterministic — agents sorted by `id` then placed by index, so reruns produce the same layout.

## Agent character system

- `name` (parsed H1) → label above NPC
- `description` (first paragraph) → role subtitle shown when player approaches
- `content` (full markdown) → system prompt for `/api/chat`
- NPCs idle-wander in a small radius around their seat and face the player on approach

## What NOT to do

- Do not add a database, cache layer, or any persistent storage
- Do not put `ANTHROPIC_API_KEY` in the browser — it stays server-side (proxy via `/api/chat`)
- Do not add a build step, bundler, or package.json scripts beyond `start`
- Do not read from `~/.claude/` — sources are the local `subagents/` and `skills/` dirs in this repo
- Do not modify anything outside `server.ts` and `public/` when working on features
