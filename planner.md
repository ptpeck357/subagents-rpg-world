# Planner — Claude Village

Project tracker for Claude Code. Update this file as tasks move through states.

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

## Phase 2 — 3D world

- [x] Bootstrap Three.js scene in `index.html` (renderer, camera, lights, fog)
- [x] Build terrain: ground plane with vertex displacement + central plaza
- [x] Buildings per top-level subagent dir + tables for nested subcategories (e.g. `database/mysql`)
- [x] Skill Hut building with shelves for each skill
- [x] Implement player character: chunky low-poly body
- [x] Over-the-shoulder follow camera with smooth lerp
- [x] WASD / arrow key movement with collision against buildings
- [ ] Add low-poly trees, flowers, rocks as scene dressing
- [ ] Walking animation on player (arm/leg swing)
- [ ] Pond / paths radiating between buildings

## Phase 3 — Agent NPCs

- [x] `GET /api/agents` called on page load; one NPC spawned per agent
- [x] Each NPC: low-poly character mesh, billboarded name label
- [x] Wander behaviour: each NPC drifts within radius of home position
- [x] Proximity detection: nearest NPC tracked each frame
- [x] Heads-up bubble: show agent name + description when within range
- [ ] Walking animation on NPC movement (arm/leg swing)
- [ ] Highlight effect (outline / glow) on nearest NPC

## Phase 4 — Chat system

- [ ] Chat panel (right sidebar): portrait, name, role, message history, input
- [ ] On proximity: activate agent, show greeting from frontmatter or generated
- [ ] Send message → `POST https://api.anthropic.com/v1/messages` directly from browser
- [ ] System prompt = agent `.md` body content
- [ ] Conversation history persisted per agent for session duration
- [ ] Typing indicator while awaiting response
- [ ] On walk-away: panel resets, history preserved in memory for return

## Phase 5 — Skills integration

- [ ] `GET /api/skills` fetched on load
- [ ] Skills displayed as collectible items or signposts on the map
- [ ] Clicking a skill item shows its content in a modal or side panel
- [ ] Agent chat system prompt optionally references relevant skills

## Phase 6 — Polish

- [ ] Smooth day/night cycle (ambient light animation)
- [ ] Idle NPC animations (head bob, look-around)
- [ ] Sound: soft ambient background (optional, user-toggled)
- [ ] Mobile touch controls (virtual joystick)
- [ ] Loading screen while Three.js and API agents initialise
- [ ] Error state when `~/.claude/subagents/` directory is missing or empty

---

## Open questions

- Should agent home positions be user-configurable (frontmatter `x`, `z` fields)?
- Should skills appear as items the player "equips" to boost agent responses?
- Add a `bun build` step later for production, or keep zero-build forever?

---

## Notes for Claude Code

- When implementing Phase 1, start with `server.ts` and test both endpoints with `curl` before touching the frontend
- Agent positions: assign by index using a fixed layout grid so reruns are deterministic
- Keep Three.js scene setup modular inside `index.html` — use clearly named `function buildTerrain()`, `function buildNPC()` etc. even in a single file
- gray-matter is the only allowed dep beyond hono — add with `bun add gray-matter hono`
- If `~/.claude/subagents/` doesn't exist, return `[]` gracefully rather than throwing
