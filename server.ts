import { Hono } from "hono";

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

app.post("/api/chat", async (c) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return c.json({ error: "ANTHROPIC_API_KEY not set on server" }, 500);
  const body = await c.req.json();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model ?? "claude-sonnet-4-5",
      max_tokens: body.max_tokens ?? 1024,
      system: body.system,
      messages: body.messages,
    }),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
});

app.get("/*", async (c) => {
  const path = c.req.path === "/" ? "/index.html" : c.req.path;
  const file = Bun.file(`./public${path}`);
  if (!(await file.exists())) return c.notFound();
  return new Response(file);
});

export default { port: 3000, fetch: app.fetch };
console.log("Claude Village running at http://localhost:3000");
