# Claude Village

A 2D top-down (Lords of Xulima–style) cozy RPG world where Claude Code subagents are NPCs you can walk up to and **chat with**. Built with Bun + Hono on the server and HTML5 Canvas + Tailwind in the browser. Client is TypeScript bundled on demand by `Bun.build` — no dist artifacts, no separate build step to run.

The village layout mirrors the `subagents/` directory tree:

- Each **top-level dir** is a **building** named after the dir (`payments/` → `PAYMENTS`). Buildings ring a central plaza; each door faces the plaza and is connected to it by a short dirt path.
- Each **second-level dir** becomes a **table inside that building** (`database/mysql/` → "mysql" table inside `DATABASE`)
- Each **`.md` file** is an **NPC** clustered around its table; its name floats above its sprite. Walk close + press **E** to chat.
- The **Skill Hut** holds entries from `skills/` lined up in front of back-wall bookshelves; walk close + press **E** to read.

## Quick start

```bash
bun install
bun start                       # boots server + opens browser to localhost:3000
```

Or, once published / linked, just:

```bash
claude-village
```

### Seamless install (one-time, ~30 seconds)

Want `/village` and `/village-stop` to work from any Claude Code session, in any project?

```bash
cd path/to/subagents-rpg-world
bun link                                                       # makes `claude-village` global in $PATH
mkdir -p ~/.claude/commands
ln -s "$(pwd)/.claude/commands/village.md"      ~/.claude/commands/village.md
ln -s "$(pwd)/.claude/commands/village-stop.md" ~/.claude/commands/village-stop.md
```

After that, inside any Claude Code session:

- `/village` — boots the server (backgrounded), opens your browser to localhost:3000
- `/village-stop` — kills the server

The slash command files live in this repo (`.claude/commands/`); the symlinks point Claude Code at them. Logs go to `/tmp/claude-village.log`. One global village process at a time. Move the repo → re-link.

### Chat auth (transition period)

| When                     | Setup                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Now → June 14, 2026**  | `cp .env.example .env` and set `ANTHROPIC_API_KEY=sk-ant-...`. Pay-as-you-go against your API credits.                                                                   |
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
│   ├── src/              Client TypeScript modules (bundled on the fly → /game.js)
│   │   ├── types.ts      Shared types
│   │   ├── world.ts      Constants, sprites, tilemap, layout, collision
│   │   ├── render.ts     Canvas drawing
│   │   └── main.ts       Entry point: data fetch, input, chat panel, game loop
│   └── sprites/          Drop PNG sprites here (see "Adding art" below)
├── subagents/            Agent source (dir-per-category, .md per agent)
├── skills/               Skill source (dir-per-skill, SKILL.md inside)
├── CLAUDE.md             Conventions for AI contributors
└── planner.md            Phase-by-phase task tracker
```

## Adding art

The engine looks for PNGs under `public/sprites/`. Anything missing falls back to a colored rectangle (with an optional label) so the game stays playable. Sprite filenames it tries:

- `building_<category>.png` — one per top-level subagent dir (e.g. `building_payments.png`), plus `building_skills.png`
- `npc_default.png`, `player.png`
- World decor: `tree.png`, `rock.png`, `flower.png`
- Interior decor: `table.png`, `skill_item.png`, `bookshelf.png`, `lamp.png`, `plant.png`, `crate.png`

Anchor each sprite at bottom-center. Recommended sizes are written next to each `defineSprite()` call in `public/src/world.ts`.

## API

| Method | Endpoint          | Purpose                                                                                                                                                                                                                                |
| ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/agents`     | Recursive scan of `./subagents/**/*.md`                                                                                                                                                                                                |
| `GET`  | `/api/skills`     | Recursive scan of `./skills/**/SKILL.md`                                                                                                                                                                                               |
| `POST` | `/api/chat`       | SSE stream — runs the Claude Agent SDK with the NPC's `.md` body as system prompt, automatically appending any **keyword-matched skills** from `skills/` under a `# Relevant skills` heading. API key / OAuth token stays server-side. |
| `POST` | `/api/chat/reset` | Clears the per-NPC SDK session id so the next chat starts fresh                                                                                                                                                                        |

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
- **Client** — TypeScript modules under `public/src/` bundled by `Bun.build` on every `/game.js` request (cached by max source mtime) + HTML5 Canvas 2D + Tailwind (Play CDN)
- **Tooling** — prettier, eslint flat config + typescript-eslint, scripts `format`/`format:check`/`lint`/`lint:fix`

See `CLAUDE.md` for the full set of conventions and `planner.md` for what's next.
