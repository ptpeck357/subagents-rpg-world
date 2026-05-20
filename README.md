# Claude Village

A 2D top-down (Lords of Xulima–style) cozy RPG world where Claude Code subagents are NPCs you can walk up to and **chat with**. Built with Bun + Hono on the server and vanilla HTML5 Canvas + Tailwind in the browser — no build step, no framework.

The village layout mirrors the `subagents/` directory tree:

- Each **top-level dir** is a **building** named after the dir (`payments/` → `PAYMENTS`)
- Each **second-level dir** is a **table out in front** of that building (`database/mysql/` → "mysql" table in front of `DATABASE`)
- Each **`.md` file** is an **NPC** clustered around its table
- The **Skill Hut** holds entries from `skills/` as items lined up out front

## Quick start

```bash
bun install
bun start                       # boots server + opens browser to localhost:3000
```

Or, once published / linked, just:

```bash
claude-village
```

### Chat auth (transition period)

| When | Setup |
|---|---|
| **Now → June 14, 2026** | `cp .env.example .env` and set `ANTHROPIC_API_KEY=sk-ant-...`. Pay-as-you-go against your API credits. |
| **June 15, 2026 onward** | Don't set the API key. Run `claude setup-token` once to mint a long-lived OAuth token. Chat then runs on your Pro/Max plan's included Agent SDK credit ($20/mo for Pro). |

Same code path either way — the SDK picks the right auth automatically. The long-lived token is the recommended path because it **won't interfere with your interactive Claude Code session's auth** (see planner.md "Auth verification" for the OAuth-refresh-race details).

## Controls

- **WASD / arrows** — walk
- **Shift** — run
- **E** — talk to nearest NPC, or read the nearest skill (inside the Skill Hut)
- **Esc** — close chat panel / skill modal
- Walk close to an NPC or skill item to see its name + role

## Project layout

```
.
├── server.ts             Bun + Hono — 4 endpoints + static serve + Agent SDK + CLI bin
├── public/
│   ├── index.html        HTML shell (Tailwind classes, DOM scaffolding)
│   ├── game.js           Canvas rendering, world gen, chat panel logic
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

Anchor each sprite at bottom-center. Recommended sizes are written next to each `defineSprite()` call in `public/game.js`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/agents` | Recursive scan of `./subagents/**/*.md` |
| `GET` | `/api/skills` | Recursive scan of `./skills/**/SKILL.md` |
| `POST` | `/api/chat` | SSE stream — runs the Claude Agent SDK with the NPC's `.md` body as system prompt, automatically appending any **keyword-matched skills** from `skills/` under a `# Relevant skills` heading. API key / OAuth token stays server-side. |
| `POST` | `/api/chat/reset` | Clears the per-NPC SDK session id so the next chat starts fresh |

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
- **Server** — Hono + `@anthropic-ai/claude-agent-sdk`
- **Client** — Vanilla JS + HTML5 Canvas 2D + Tailwind (Play CDN), no bundler

See `CLAUDE.md` for the full set of conventions and `planner.md` for what's next.
