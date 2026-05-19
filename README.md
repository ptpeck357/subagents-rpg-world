# Claude Village

A 2D top-down (Lords of Xulima–style) cozy RPG world where Claude Code subagents are NPCs you can walk up to and (eventually) chat with. Built with Bun + Hono on the server and vanilla HTML5 Canvas in the browser — no build step, no framework, no CDN.

The village layout mirrors the `subagents/` directory tree:

- Each **top-level dir** is a **building** named after the dir (`payments/` → `PAYMENTS`)
- Each **second-level dir** is a **table out in front** of that building (`database/mysql/` → "mysql" table in front of `DATABASE`)
- Each **`.md` file** is an **NPC** clustered around its table
- The **Skill Hut** holds entries from `skills/` as items lined up out front

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
├── server.ts             Bun + Hono — 3 endpoints + static serve
├── public/
│   ├── index.html        Single-file 2D canvas game
│   └── sprites/          Drop PNG sprites here (see "Adding art" below)
├── subagents/            Agent source (dir-per-category, .md per agent)
├── skills/               Skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md             Conventions for AI contributors
└── planner.md            Phase-by-phase task tracker
```

## Adding art

The engine looks for PNGs under `public/sprites/`. Anything missing falls back to a labeled colored rectangle so the game stays playable. Sprite filenames it tries:

- `building_<category>.png` — one per top-level subagent dir (e.g. `building_payments.png`), plus `building_skills.png`
- `npc_default.png`, `player.png`
- `tree.png`, `rock.png`, `flower.png`, `table.png`, `skill_item.png`

Anchor each sprite at bottom-center. Recommended sizes are written next to each `defineSprite()` call in `public/index.html`.

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
- **Client** — Vanilla JS + HTML5 Canvas 2D, no bundler, no CDN

See `CLAUDE.md` for the full set of conventions and `planner.md` for what's next.
