# Planner — Claude Village

Project tracker for Claude Code. Update this file as tasks move through states.

**Note:** the original Three.js plan was swapped for a 2D top-down (Lords of Xulima–style) canvas renderer. Phase 2 / 3 items below were re-done in 2D.

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
- [x] Add `POST /api/chat` — server-side proxy to Anthropic using `ANTHROPIC_API_KEY`
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
- [x] Pond with sand rim
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
- [ ] Highlight effect (outline / glow) on nearest NPC

## Phase 4 — Chat system

- [ ] Chat panel (right sidebar): portrait, name, role, message history, input
- [ ] On proximity: activate agent, show greeting (first paragraph) or generated
- [ ] Send message → `POST /api/chat` (server proxies to Anthropic; key stays server-side)
- [ ] System prompt = agent `.md` body content
- [ ] Conversation history persisted per agent for session duration
- [ ] Typing indicator while awaiting response
- [ ] On walk-away: panel resets, history preserved in memory for return

## Phase 5 — Skills integration

- [x] `GET /api/skills` fetched on load
- [x] Skills rendered as items on shelves inside the Skill Hut
- [ ] Clicking a skill item shows its content in a modal or side panel
- [ ] Agent chat system prompt optionally references relevant skills

## Phase 6 — Polish

- [ ] Smooth day/night cycle (ambient light animation)
- [ ] Idle NPC animations (head bob, look-around)
- [ ] Sound: soft ambient background (optional, user-toggled)
- [ ] Mobile touch controls (virtual joystick)
- [x] Loading screen while Three.js and API agents initialise
- [ ] Error state when `./subagents/` directory is missing or empty

---

## Phase 7 — CLI-only, browser UI, chat bridged to user's Claude Code

### The idea (in user's words)

- **No API key.** Don't want to plug `ANTHROPIC_API_KEY` in. Don't want a separate Anthropic billing path.
- **One agent only — the user's own Claude Code.** Whatever model / login / quota Claude Code already has, reuse it.
- **The "subagents" in this RPG are *topic personas*, not separate API accounts.** Each NPC is a way of asking the same underlying agent about a specific topic (api design, react patterns, payments, etc.). The subagent's `.md` body is just a system prompt / persona that gets handed to the same Claude Code session.
- **Distribution = single CLI command, browser UI.** Type `claude-village` (or similar) in a terminal → it boots a local server → opens the user's default browser to the 2D village → walking up to an NPC and typing in the chat panel sends that message *back into the user's Claude Code* with the NPC's persona attached → response streams into the browser bubble.

The browser is just the *visual layer*. All language model traffic stays inside the user's existing Claude Code installation. No env vars, no `.env`, no extra accounts.

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
- [x] Add `package.json` `"bin": { "claude-village": "./server.ts" }` + `#!/usr/bin/env bun` shebang + `chmod +x`
- [x] After server boots, auto-open default browser (`open` / `xdg-open` / `start` per platform); `CLAUDE_VILLAGE_NO_OPEN=1` to disable
- [x] Browser-side chat panel: right sidebar, **E** opens nearest-NPC chat, **Esc** closes, per-NPC history kept client-side, SSE streaming render, reset button
- [ ] Replace `ANTHROPIC_API_KEY` requirement: after June 15, 2026 — remove env check, document `claude setup-token` long-lived OAuth path
- [ ] Publish (npm or `bunx github:…`) so the install story is one command
- [ ] Update `README.md`: prereqs, run command, dual auth paths

### Dual auth modes (transition period)

| Mode | When | Setup |
|---|---|---|
| **Now → June 14, 2026** | Pay-as-you-go via existing API credits | Set `ANTHROPIC_API_KEY` in env; SDK uses it. User's $10 credit balance covers casual use |
| **June 15, 2026 onward** | Pro plan included quota | Unset `ANTHROPIC_API_KEY`; run `claude setup-token` once; SDK uses the long-lived OAuth token. Zero collision with interactive Claude Code sessions |

Same code path either way — SDK auth precedence handles the switch automatically.

### Why this is worth doing

- Anyone with Claude Code installed can run it — no separate account, no separate bill
- The RPG layer adds discoverability: subagents stop being a folder of `.md` files and become *places you walk into and ask questions of*
- Subagent personas stay version-controlled in `subagents/` — drop a new `.md`, refresh, new NPC appears

### Risks / unknowns

- ~~Whether the SDK / `claude -p` cleanly streams *while a Claude Code session is already running*~~ — **verified: there IS a collision risk today**, see "Auth verification" below.
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

## World sizing (smaller — see /plan "make-the-world-smaller")

- [x] First pass: 24×24 tiles, ringR 520, drop pond
- [x] Confirmed: at 24×24 the building ring still overflowed 1280×800. Final values below.
- [x] Final tight fit for 1280×800: **20×12 tiles (1280×768 px)**, ringR **230**, building sprites scaled down (~170w × 140h, db 180×150, skills 160×120), door zones 44×18, decoration band 110–230, plaza radius 1.6 tiles. Village fits with **0 scrolling** on a 1280×800 viewport; world auto-centers on larger viewports.

## Open questions

- Should agent home positions be user-configurable (frontmatter `x`, `z` fields)?
- Should skills appear as items the player "equips" to boost agent responses?
- Add a `bun build` step later for production, or keep zero-build forever?

---

## Notes for Claude Code

- Test endpoints with `curl` before touching the frontend
- Agent positions: deterministic — sort agents by `id` then place by index around their table / building center
- Keep Three.js scene setup modular inside `index.html` — use clearly named `function buildTerrain()`, `function buildNPC()` etc. even in a single file
- Only dep beyond `hono` should be added with explicit user approval. Agent/skill files have no YAML frontmatter, so `gray-matter` is **not** used — H1 + first paragraph parsing lives in `server.ts`
- If `./subagents/` is missing or empty, return `[]` gracefully rather than throwing
