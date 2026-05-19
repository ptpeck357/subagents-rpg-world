# Claude Village

A 3D cozy RPG world where Claude Code subagents are NPCs you can walk up to and (eventually) chat with. Built with Bun + Hono on the server and vanilla Three.js in the browser — no build step, no framework.

The village layout mirrors the `subagents/` directory tree:

- Each **top-level dir** is a **building** named after the dir (`payments/` → `PAYMENTS`)
- Each **second-level dir** is a **table inside that building** (`database/mysql/` → "mysql" table inside `DATABASE`)
- Each **`.md` file** is an **NPC** seated near its table
- The **Skill Hut** holds entries from `skills/` on shelves

## Quick start

```bash
bun install
bun start                       # http://localhost:3000
```

Optional, for chat (Phase 4):

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
```

## Controls

- **WASD / arrows** — walk
- **Shift** — run
- Walk close to an NPC to see name + role

## Project layout

```
.
├── server.ts          Bun + Hono — 3 endpoints + static serve
├── public/index.html  Single-file Three.js village
├── subagents/         Agent source (dir-per-category, .md per agent)
├── skills/            Skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md          Conventions for AI contributors
└── planner.md         Phase-by-phase task tracker
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/agents` | Recursive scan of `./subagents/**/*.md` |
| `GET` | `/api/skills` | Recursive scan of `./skills/**/SKILL.md` |
| `POST` | `/api/chat` | Proxy to Anthropic — keeps the API key off the browser |

Parsing has no YAML frontmatter: the first `# H1` is the name, the next paragraph is the description.

## Adding an NPC

Drop a markdown file under `subagents/<category>/[<subcategory>/]<name>.md`:

```markdown
# Friendly Name

One-sentence description that appears under the name when the player walks close.

…rest of the file becomes the chat system prompt…
```

Refresh the page. A new NPC appears at the corresponding building (and table, if nested).

## Stack

- **Runtime** — Bun
- **Server** — Hono (no extra middleware)
- **Client** — Three.js r128 via CDN, no bundler

See `CLAUDE.md` for the full set of conventions and `planner.md` for what's next.
