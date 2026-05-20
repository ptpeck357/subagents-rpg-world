#!/usr/bin/env bun
import { Hono } from 'hono';
import { existsSync } from 'node:fs';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Resolve content dirs relative to this file so `claude-village` works from any cwd.
const ROOT = import.meta.dir;
const SUBAGENTS_DIR = `${ROOT}/subagents`;
const SKILLS_DIR = `${ROOT}/skills`;
const PUBLIC_DIR = `${ROOT}/public`;

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
    const lines = content.split('\n');
    let name = fallbackName;
    let description = '';

    const h1 = lines.find((l) => /^#\s+/.test(l));
    if (h1) name = h1.replace(/^#\s+/, '').trim();

    let pastH1 = !h1;
    for (const line of lines) {
        if (!pastH1) {
            if (/^#\s+/.test(line)) pastH1 = true;
            continue;
        }
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        description = trimmed.replace(/^[*_>\-\s]+/, '').slice(0, 160);
        break;
    }

    return { name, description };
}

async function loadAgents(): Promise<Agent[]> {
    if (!existsSync(SUBAGENTS_DIR)) return [];
    const glob = new Bun.Glob('**/*.md');
    const agents: Agent[] = [];
    for await (const rel of glob.scan({ cwd: SUBAGENTS_DIR })) {
        const parts = rel.split('/');
        const category = parts[0];
        const subcategory = parts.length > 2 ? parts[1] : undefined;
        const stem = parts[parts.length - 1].replace(/\.md$/, '');
        const content = await Bun.file(`${SUBAGENTS_DIR}/${rel}`).text();
        const { name, description } = parseMarkdown(content, stem);
        agents.push({
            id: rel.replace(/\.md$/, ''),
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
    if (!existsSync(SKILLS_DIR)) return [];
    const glob = new Bun.Glob('**/SKILL.md');
    const skills: Skill[] = [];
    for await (const rel of glob.scan({ cwd: SKILLS_DIR })) {
        const id = rel.split('/')[0];
        const content = await Bun.file(`${SKILLS_DIR}/${rel}`).text();
        const { name, description } = parseMarkdown(content, id);
        skills.push({ id, name, description, content });
    }
    return skills.sort((a, b) => a.id.localeCompare(b.id));
}

const app = new Hono();

app.get('/api/agents', async (c) => c.json(await loadAgents()));
app.get('/api/skills', async (c) => c.json(await loadSkills()));

// Per-NPC conversation memory: agentId → SDK session id
const sessions = new Map<string, string>();

// Keyword-match skills to an agent's system prompt. Generic words filtered out.
const SKILL_STOP_WORDS = new Set(['skill', 'skills', 'with', 'into', 'from', 'this', 'that']);
async function relevantSkills(agentSystem: string): Promise<Skill[]> {
    const skills = await loadSkills();
    const haystack = agentSystem.toLowerCase();
    return skills.filter((s) => {
        const tokens = [...s.id.split(/[-_]/), ...s.name.toLowerCase().split(/\s+/)].filter(
            (t) => t.length > 3 && !SKILL_STOP_WORDS.has(t),
        );
        return tokens.some((t) => haystack.includes(t));
    });
}

app.post('/api/chat', async (c) => {
    const body = (await c.req.json()) as { agentId: string; system: string; message: string };
    const { agentId, system, message } = body;
    if (!agentId || !message) return c.json({ error: 'agentId and message required' }, 400);

    const skills = await relevantSkills(system);
    const enrichedSystem = skills.length
        ? `${system}\n\n---\n\n# Relevant skills\n\nThe following skills are applicable to this conversation. Apply them when their guidance is relevant.\n\n${skills.map((s) => `## ${s.name}\n\n${s.content}`).join('\n\n')}`
        : system;

    const resume = sessions.get(agentId);
    const stream = query({
        prompt: message,
        options: {
            systemPrompt: enrichedSystem,
            ...(resume ? { resume } : {}),
        },
    });

    const enc = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) =>
                controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
            try {
                for await (const msg of stream) {
                    if (msg.type === 'assistant') {
                        const blocks = (msg as any).message?.content ?? [];
                        for (const b of blocks) {
                            if (b.type === 'text' && b.text) send({ type: 'chunk', text: b.text });
                        }
                    } else if (msg.type === 'result') {
                        const sid = (msg as any).session_id;
                        if (sid) sessions.set(agentId, sid);
                        send({ type: 'done' });
                    } else if (msg.type === 'system') {
                        // ignore system frames
                    }
                }
            } catch (e) {
                send({ type: 'error', error: String(e instanceof Error ? e.message : e) });
            } finally {
                controller.close();
            }
        },
    });
    return new Response(readable, {
        headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
        },
    });
});

app.post('/api/chat/reset', async (c) => {
    const { agentId } = await c.req.json();
    sessions.delete(agentId);
    return c.json({ ok: true });
});

// bundle public/src/main.ts → /game.js on the fly; cached by max src mtime
const SRC_DIR = `${PUBLIC_DIR}/src`;
let gameJsCache: { mtime: number; body: string } | null = null;

async function srcMaxMtime(): Promise<number> {
    const glob = new Bun.Glob('*.ts');
    let max = 0;
    for await (const f of glob.scan({ cwd: SRC_DIR })) {
        const m = Bun.file(`${SRC_DIR}/${f}`).lastModified;
        if (m > max) max = m;
    }
    return max;
}

app.get('/game.js', async () => {
    const mtime = await srcMaxMtime();
    if (!gameJsCache || gameJsCache.mtime !== mtime) {
        const out = await Bun.build({
            entrypoints: [`${SRC_DIR}/main.ts`],
            target: 'browser',
            format: 'esm',
        });
        if (!out.success) {
            const log = out.logs.map(String).join('\n');
            return new Response(`/* build failed:\n${log}\n*/`, {
                status: 500,
                headers: { 'content-type': 'application/javascript; charset=utf-8' },
            });
        }
        gameJsCache = { mtime, body: await out.outputs[0].text() };
    }
    return new Response(gameJsCache.body, {
        headers: { 'content-type': 'application/javascript; charset=utf-8' },
    });
});

app.get('/*', async (c) => {
    const path = c.req.path === '/' ? '/index.html' : c.req.path;
    const file = Bun.file(`${PUBLIC_DIR}${path}`);
    if (!(await file.exists())) return c.notFound();
    return new Response(file);
});

const PORT = Number(process.env.PORT ?? 3000);
Bun.serve({ port: PORT, fetch: app.fetch });
const url = `http://localhost:${PORT}`;
console.log(`Claude Village running at ${url}`);

if (!process.env.CLAUDE_VILLAGE_NO_OPEN) {
    const opener =
        process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
    try {
        Bun.spawn([opener, url], { stdout: 'ignore', stderr: 'ignore' });
    } catch {
        // platform lacks the default opener; the user can paste the URL manually
    }
}
