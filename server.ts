#!/usr/bin/env bun
import { Hono } from "hono";
import { query } from "@anthropic-ai/claude-agent-sdk";

type Agent = {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  subcategory?: string;
};

type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
};

function parseMarkdown(content: string, fallbackName: string) {
  const lines = content.split("\n");
  let name = fallbackName;
  let description = "";

  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1) name = h1.replace(/^#\s+/, "").trim();

  let pastH1 = !h1;
  for (const line of lines) {
    if (!pastH1) {
      if (/^#\s+/.test(line)) pastH1 = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    description = trimmed.replace(/^[*_>\-\s]+/, "").slice(0, 160);
    break;
  }

  return { name, description };
}

async function loadAgents(): Promise<Agent[]> {
  const glob = new Bun.Glob("**/*.md");
  const agents: Agent[] = [];
  for await (const rel of glob.scan({ cwd: "./subagents" })) {
    const parts = rel.split("/");
    const category = parts[0];
    const subcategory = parts.length > 2 ? parts[1] : undefined;
    const stem = parts[parts.length - 1].replace(/\.md$/, "");
    const content = await Bun.file(`./subagents/${rel}`).text();
    const { name, description } = parseMarkdown(content, stem);
    agents.push({
      id: rel.replace(/\.md$/, ""),
      name,
      description,
      content,
      category,
      ...(subcategory ? { subcategory } : {}),
    });
  }
  return agents.sort((a, b) => a.id.localeCompare(b.id));
}

async function loadSkills(): Promise<Skill[]> {
  const glob = new Bun.Glob("**/SKILL.md");
  const skills: Skill[] = [];
  for await (const rel of glob.scan({ cwd: "./skills" })) {
    const id = rel.split("/")[0];
    const content = await Bun.file(`./skills/${rel}`).text();
    const { name, description } = parseMarkdown(content, id);
    skills.push({ id, name, description, content });
  }
  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

const app = new Hono();

app.get("/api/agents", async (c) => c.json(await loadAgents()));
app.get("/api/skills", async (c) => c.json(await loadSkills()));

// Per-NPC conversation memory: agentId → SDK session id
const sessions = new Map<string, string>();

app.post("/api/chat", async (c) => {
  const body = await c.req.json() as { agentId: string; system: string; message: string };
  const { agentId, system, message } = body;
  if (!agentId || !message) return c.json({ error: "agentId and message required" }, 400);

  const resume = sessions.get(agentId);
  const stream = query({
    prompt: message,
    options: {
      systemPrompt: system,
      ...(resume ? { resume } : {}),
    },
  });

  const enc = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const msg of stream) {
          if (msg.type === "assistant") {
            const blocks = (msg as any).message?.content ?? [];
            for (const b of blocks) {
              if (b.type === "text" && b.text) send({ type: "chunk", text: b.text });
            }
          } else if (msg.type === "result") {
            const sid = (msg as any).session_id;
            if (sid) sessions.set(agentId, sid);
            send({ type: "done" });
          } else if (msg.type === "system") {
            // ignore system frames
          }
        }
      } catch (e) {
        send({ type: "error", error: String(e instanceof Error ? e.message : e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
});

app.post("/api/chat/reset", async (c) => {
  const { agentId } = await c.req.json();
  sessions.delete(agentId);
  return c.json({ ok: true });
});

// transpile public/game.ts → JS on the fly; cached after first build
const tsTranspiler = new Bun.Transpiler({ loader: "ts", target: "browser" });
let gameJsCache: { mtime: number; body: string } | null = null;
app.get("/game.js", async (c) => {
  const file = Bun.file("./public/game.ts");
  const mtime = file.lastModified;
  if (!gameJsCache || gameJsCache.mtime !== mtime) {
    const src = await file.text();
    gameJsCache = { mtime, body: tsTranspiler.transformSync(src) };
  }
  return new Response(gameJsCache.body, {
    headers: { "content-type": "application/javascript; charset=utf-8" },
  });
});

app.get("/*", async (c) => {
  const path = c.req.path === "/" ? "/index.html" : c.req.path;
  const file = Bun.file(`./public${path}`);
  if (!(await file.exists())) return c.notFound();
  return new Response(file);
});

const PORT = Number(process.env.PORT ?? 3000);
Bun.serve({ port: PORT, fetch: app.fetch });
const url = `http://localhost:${PORT}`;
console.log(`Claude Village running at ${url}`);

if (!process.env.CLAUDE_VILLAGE_NO_OPEN) {
  const opener =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    "xdg-open";
  try { Bun.spawn([opener, url], { stdout: "ignore", stderr: "ignore" }); } catch {}
}
