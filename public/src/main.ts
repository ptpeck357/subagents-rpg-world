import type { Agent, Building, ChatMessage, MsgVariant, Player, Scene, Skill } from './types';
import {
    PLAYER_SPEED,
    PLAYER_RUN,
    WORLD_W,
    WORLD_H,
    blockedInterior,
    blockedVillage,
    buildings,
    layoutWorld,
    rectContains,
} from './world';
import {
    clearFrame,
    currentNearest,
    currentNearestSkill,
    renderInterior,
    renderVillage,
    setRenderContext,
} from './render';

// ---------- data ----------
const [agentsRes, skillsRes] = (await Promise.all([
    fetch('/api/agents')
        .then((r) => r.json())
        .catch(() => [] as Agent[]),
    fetch('/api/skills')
        .then((r) => r.json())
        .catch(() => [] as Skill[]),
])) as [Agent[], Skill[]];

if (!Array.isArray(agentsRes) || agentsRes.length === 0) {
    document.getElementById('loading')?.remove();
    const empty = document.getElementById('empty-state');
    if (empty) {
        empty.classList.remove('hidden');
        empty.classList.add('grid');
    }
} else {
    bootstrap();
}

function bootstrap(): void {
    const byCategory: Record<string, Agent[]> = {};
    for (const a of agentsRes) (byCategory[a.category] ||= []).push(a);
    const categories = Object.keys(byCategory).sort();

    // ---------- canvas ----------
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const nearbyEl = document.getElementById('nearby') as HTMLElement;
    setRenderContext(canvas, ctx, nearbyEl);

    function resize(): void {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        ctx.imageSmoothingEnabled = false;
    }
    resize();
    addEventListener('resize', resize);

    // ---------- world layout ----------
    layoutWorld(categories, byCategory, skillsRes);

    // ---------- player + scene ----------
    const wcx = WORLD_W / 2,
        wcy = WORLD_H / 2;
    const player: Player = { x: wcx, y: wcy + 80, facing: 'south', walking: false, walkPhase: 0 };
    let scene: Scene = 'village';
    let currentBuilding: Building | null = null;

    // ---------- input ----------
    const keys: Record<string, boolean> = {};
    addEventListener('keydown', (e: KeyboardEvent) => {
        keys[e.key.toLowerCase()] = true;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()))
            e.preventDefault();
    });
    addEventListener('keyup', (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false));

    function enterBuilding(b: Building): void {
        currentBuilding = b;
        scene = 'interior';
        player.x = b.interior.exitDoor.x;
        player.y = b.interior.exitDoor.y - 36;
        player.facing = 'north';
    }

    function exitBuilding(): void {
        const b = currentBuilding!;
        scene = 'village';
        currentBuilding = null;
        player.x = b.door.x + b.exitOffset.x;
        player.y = b.door.y + b.exitOffset.y;
        player.facing = b.exitFacing;
    }

    // ---------- chat panel (DOM) ----------
    let chatAgent: Agent | null = null;
    const chatPanel = document.getElementById('chat') as HTMLElement;
    const chatName = document.getElementById('chat-name') as HTMLElement;
    const chatRole = document.getElementById('chat-role') as HTMLElement;
    const chatMsgs = document.getElementById('chat-msgs') as HTMLElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatClose = document.getElementById('chat-close') as HTMLButtonElement;
    const chatReset = document.getElementById('chat-reset') as HTMLButtonElement;
    const skillModal = document.getElementById('skill-modal') as HTMLElement;
    const skillModalName = document.getElementById('skill-modal-name') as HTMLElement;
    const skillModalDesc = document.getElementById('skill-modal-desc') as HTMLElement;
    const skillModalBody = document.getElementById('skill-modal-body') as HTMLElement;
    const skillModalClose = document.getElementById('skill-modal-close') as HTMLButtonElement;

    function skillModalOpen(): boolean {
        return !skillModal.classList.contains('hidden');
    }
    function openSkillModal(skill: Skill): void {
        skillModalName.textContent = skill.name;
        skillModalDesc.textContent = skill.description || '';
        skillModalBody.textContent = skill.content;
        skillModal.classList.remove('hidden');
        skillModal.classList.add('flex');
    }
    function closeSkillModal(): void {
        skillModal.classList.add('hidden');
        skillModal.classList.remove('flex');
    }
    skillModalClose.addEventListener('click', closeSkillModal);
    skillModal.addEventListener('click', (e) => {
        if (e.target === skillModal) closeSkillModal();
    });

    const histories = new Map<string, ChatMessage[]>();

    const MSG_BASE = 'mb-3.5 leading-relaxed whitespace-pre-wrap break-words';
    const MSG_VARIANT: Record<MsgVariant, string> = {
        you: 'text-sky-300',
        npc: 'text-zinc-100',
        err: 'text-red-400 text-xs',
        typing: 'text-zinc-500 italic text-xs',
    };

    function chatOpen(): boolean {
        return !chatPanel.classList.contains('hidden');
    }
    function showChat(): void {
        chatPanel.classList.remove('hidden');
        chatPanel.classList.add('flex');
    }
    function hideChat(): void {
        chatPanel.classList.add('hidden');
        chatPanel.classList.remove('flex');
    }
    function openChat(agent: Agent): void {
        chatAgent = agent;
        chatName.textContent = agent.name;
        chatRole.textContent = agent.description || agent.category || '';
        chatMsgs.innerHTML = '';
        const hist = histories.get(agent.id) || [];
        for (const m of hist) appendMsg(m.role, m.text);
        showChat();
        setTimeout(() => chatInput.focus(), 50);
    }
    function closeChat(): void {
        hideChat();
        chatAgent = null;
    }
    function appendMsg(role: 'you' | 'npc', text: string, variant?: MsgVariant): HTMLDivElement {
        const div = document.createElement('div');
        const v: MsgVariant = variant ?? role;
        div.className = `${MSG_BASE} ${MSG_VARIANT[v] || ''}`.trim();
        div.textContent = role === 'you' ? `you › ${text}` : text;
        chatMsgs.appendChild(div);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
        return div;
    }

    chatClose.addEventListener('click', closeChat);
    chatReset.addEventListener('click', async () => {
        if (!chatAgent) return;
        histories.delete(chatAgent.id);
        chatMsgs.innerHTML = '';
        await fetch('/api/chat/reset', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ agentId: chatAgent.id }),
        });
    });
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!chatAgent) return;
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        chatSend.disabled = true;

        const hist = histories.get(chatAgent.id) || [];
        hist.push({ role: 'you', text });
        histories.set(chatAgent.id, hist);
        appendMsg('you', text);
        const npcDiv = appendMsg('npc', '');
        const typing = appendMsg('npc', 'thinking…', 'typing');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    agentId: chatAgent.id,
                    system: chatAgent.content,
                    message: text,
                }),
            });
            if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            let full = '';
            let started = false;
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const events = buf.split('\n\n');
                buf = events.pop() || '';
                for (const ev of events) {
                    const line = ev.split('\n').find((l) => l.startsWith('data: '));
                    if (!line) continue;
                    try {
                        const obj = JSON.parse(line.slice(6));
                        if (obj.type === 'chunk') {
                            if (!started) {
                                typing.remove();
                                started = true;
                            }
                            full += obj.text;
                            npcDiv.textContent = full;
                            chatMsgs.scrollTop = chatMsgs.scrollHeight;
                        } else if (obj.type === 'error') {
                            if (!started) typing.remove();
                            npcDiv.className = `${MSG_BASE} ${MSG_VARIANT.err}`;
                            npcDiv.textContent = `error: ${obj.error}`;
                        }
                    } catch {
                        // ignore malformed SSE chunks
                    }
                }
            }
            if (!started) typing.remove();
            if (full) hist.push({ role: 'npc', text: full });
        } catch (err) {
            typing.remove();
            npcDiv.className = `${MSG_BASE} ${MSG_VARIANT.err}`;
            const msg = err instanceof Error ? err.message : String(err);
            npcDiv.textContent = `error: ${msg}`;
        } finally {
            chatSend.disabled = false;
            chatInput.focus();
        }
    });

    addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
            if (chatOpen()) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeChat();
                }
                return;
            }
            if (skillModalOpen()) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSkillModal();
                }
                return;
            }
            if (e.key.toLowerCase() === 'e') {
                if (currentNearest) {
                    e.preventDefault();
                    openChat(currentNearest.agent);
                } else if (currentNearestSkill) {
                    e.preventDefault();
                    openSkillModal(currentNearestSkill.skill);
                }
            }
        },
        true,
    );

    // ---------- main loop ----------
    let last = performance.now();
    document.getElementById('loading')?.remove();

    function update(dt: number, now: number): void {
        if (chatOpen() || skillModalOpen()) {
            player.walking = false;
            return;
        }
        let dx = 0,
            dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;
        const len = Math.hypot(dx, dy);
        const speed = keys['shift'] ? PLAYER_RUN : PLAYER_SPEED;
        player.walking = len > 0;
        if (len > 0) {
            dx /= len;
            dy /= len;
            if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? 'east' : 'west';
            else player.facing = dy > 0 ? 'south' : 'north';
            const nx = player.x + dx * speed * dt;
            const ny = player.y + dy * speed * dt;
            const isBlocked =
                scene === 'village'
                    ? blockedVillage
                    : (px: number, py: number) =>
                          blockedInterior(currentBuilding!.interior, px, py);
            if (!isBlocked(nx, player.y)) player.x = nx;
            if (!isBlocked(player.x, ny)) player.y = ny;
            player.walkPhase += dt * (keys['shift'] ? 12 : 8);
        }

        if (scene === 'village') {
            const pad = 12;
            for (const b of buildings) {
                const d = b.door;
                if (
                    player.x > d.x - d.w / 2 - pad &&
                    player.x < d.x + d.w / 2 + pad &&
                    player.y > d.y - d.h / 2 - pad &&
                    player.y < d.y + d.h / 2 + pad
                ) {
                    enterBuilding(b);
                    break;
                }
            }
        } else {
            const room = currentBuilding!.interior;
            if (rectContains(room.exitDoor, player.x, player.y)) exitBuilding();
            for (const n of room.npcs) {
                const t = now * 0.0005 + n.seed;
                n.x = n.home.x + Math.cos(t) * 10;
                n.y = n.home.y + Math.sin(t * 1.3) * 6;
            }
        }
    }

    function frame(now: number): void {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt, now);
        clearFrame();
        if (scene === 'village') renderVillage(player, now);
        else renderInterior(currentBuilding!, player, now);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
