/**
 * HiC VIDEO RENDERER (E3.1, 2026-08-21).
 *
 * An HTTP front door for HyperFrames, following the platform's service conventions:
 * a `/health` endpoint shaped like every other service's, JSON in and JSON out, and no
 * assumption that the caller can reach the filesystem.
 *
 * WHY A SIDECAR. HyperFrames is Node-only and the research proxy is Python, so the two
 * cannot share a process. The platform already splits this way for the PPTX exporter and
 * the diagram renderer, so this is the existing pattern rather than a new one.
 *
 * WHAT IT REFUSES, AND WHY THAT MATTERS MOST HERE. A render bakes text into pixels, and
 * a pixel cannot be repaired by a later pass. Every anti-slop rule HiC enforces on a
 * deck (em-dashes, provider artifact tags, the banned lexicon, emoji) therefore has to
 * hold BEFORE the frames are captured, so this service inspects the composition and
 * refuses one that carries them. The alternative is a client-facing video with a banned
 * phrase burned in permanently, which is the worst version of the failure the whole
 * gate stack exists to prevent.
 *
 * Renders take minutes and hold a Chromium per worker, so the queue is explicit and
 * shallow. A caller that wants progress polls the job.
 */
import { createServer } from 'node:http';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 4600);
const RENDERS_DIR = process.env.PRODUCER_RENDERS_DIR || '/renders';
/** One render already saturates several cores; two at once is the ceiling. */
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_RENDERS || 1);
const MAX_QUEUE = Number(process.env.MAX_QUEUED_RENDERS || 8);
/** A 60-second 1080p render took about 85 seconds on the reference machine. */
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 15 * 60 * 1000);

// ---------------------------------------------------------------------------
// The pre-render content gate
// ---------------------------------------------------------------------------

/**
 * Format tells are banned outright in `.claude/CLAUDE.md` and cannot be fixed after a
 * frame is captured, so they are refusals rather than warnings.
 */
const FORMAT_TELLS = [
    { re: /—/, name: 'em-dash' },
    { re: /oaicite|oai_citation|contentReference|turn\d+search\d+/i, name: 'provider artifact tag' },
    { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, name: 'emoji' },
    { re: /\bEVIDENCE\s+GAP\b|\bTBD\b|\[needs baseline\]/i, name: 'QA annotation' },
    { re: /[\w./-]+\.md#c\d+/i, name: 'raw manifest pointer' },
];

/**
 * The short list, kept deliberately short. The full 350-entry lexicon lives in the SPA
 * and runs at generation time; what reaches here has already been through it, so this
 * catches the survivors rather than duplicating the list.
 */
const BANNED = [
    'paradigm shift', 'game-changer', 'cutting-edge', 'best-in-class', 'seamless',
    'actionable insights', 'thought leadership', 'move the needle', 'deep dive',
    'low-hanging fruit', 'delve', 'tapestry', 'meticulous', 'showcase', 'utilize',
    'comprehensive', 'multifaceted', 'facilitate', 'pivotal', 'robust', 'leverage',
    'in today’s rapidly evolving', 'it’s worth noting', 'needless to say',
    'unprecedented', 'transformative', 'revolutionary', 'game changer',
];

/** Only VISIBLE text is judged: markup, URLs and script are not copy. */
export function visibleText(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function inspectComposition(html) {
    const problems = [];
    const text = visibleText(html);
    for (const tell of FORMAT_TELLS) {
        if (tell.re.test(text)) problems.push(`visible copy contains a ${tell.name}`);
    }
    const lower = text.toLowerCase();
    for (const phrase of BANNED) {
        if (lower.includes(phrase.toLowerCase())) problems.push(`visible copy contains the banned phrase "${phrase}"`);
    }
    // A composition with no timeline renders one frozen frame and reports success, which
    // looks like a working render and is not one.
    if (!/window\.__timelines/.test(String(html || ''))) {
        problems.push('no window.__timelines entry: a composition without a paused, seekable timeline renders a still frame');
    }
    if (!/data-composition-id=/.test(String(html || ''))) {
        problems.push('no data-composition-id on the root element');
    }
    return { ok: problems.length === 0, problems, inspectedChars: text.length };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const jobs = new Map();
let active = 0;
const queue = [];

const pump = () => {
    while (active < MAX_CONCURRENT && queue.length) {
        const next = queue.shift();
        active++;
        next().finally(() => { active--; pump(); });
    }
};

async function runRender(job, html, assets, opts) {
    const work = await mkdtemp(join(tmpdir(), 'hicvid-'));
    try {
        await writeFile(join(work, 'index.html'), html, 'utf8');
        await writeFile(join(work, 'hyperframes.json'), JSON.stringify({
            paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
        }), 'utf8');
        if (assets && typeof assets === 'object') {
            await mkdir(join(work, 'assets'), { recursive: true });
            for (const [name, b64] of Object.entries(assets)) {
                // basename only: an asset key must never escape the working directory.
                const safe = basename(String(name));
                if (!safe || safe.startsWith('.')) continue;
                await writeFile(join(work, 'assets', safe), Buffer.from(String(b64), 'base64'));
            }
        }
        await mkdir(RENDERS_DIR, { recursive: true });
        const outPath = join(RENDERS_DIR, `${job.id}.mp4`);

        const args = [
            'hyperframes', 'render',
            '--output', outPath,
            '--fps', String(opts.fps || 30),
            '--quality', opts.quality || 'high',
        ];
        job.status = 'rendering';
        job.startedAt = Date.now();

        const child = spawn('npx', args, {
            cwd: work,
            env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let log = '';
        const capture = (buf) => { log = (log + buf.toString()).slice(-8000); job.log = log; };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);

        const timer = setTimeout(() => { job.timedOut = true; child.kill('SIGKILL'); }, RENDER_TIMEOUT_MS);
        const code = await new Promise(res => child.on('close', res));
        clearTimeout(timer);

        if (job.timedOut) {
            job.status = 'error';
            job.error = `render exceeded ${Math.round(RENDER_TIMEOUT_MS / 1000)}s and was killed`;
        } else if (code !== 0 || !existsSync(outPath)) {
            job.status = 'error';
            job.error = `hyperframes exited ${code}`;
        } else {
            job.status = 'done';
            job.outputPath = outPath;
            job.url = `/outputs/${job.id}.mp4`;
        }
    } catch (e) {
        job.status = 'error';
        job.error = e?.message || String(e);
    } finally {
        job.finishedAt = Date.now();
        await rm(work, { recursive: true, force: true }).catch(() => {});
    }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const json = (res, code, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
    res.end(payload);
};

const readBody = (req) => new Promise((resolve_, reject) => {
    let raw = '';
    req.on('data', c => {
        raw += c;
        if (raw.length > 64 * 1024 * 1024) reject(new Error('request body over 64MB'));
    });
    req.on('end', () => { try { resolve_(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
});

const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
            status: 'healthy', service: 'video-renderer',
            active, queued: queue.length, jobs: jobs.size,
        });
    }

    // Inspect a composition without spending a render on it.
    if (req.method === 'POST' && url.pathname === '/lint') {
        try {
            const body = await readBody(req);
            return json(res, 200, inspectComposition(body.html || ''));
        } catch (e) {
            return json(res, 400, { ok: false, problems: [e?.message || String(e)] });
        }
    }

    if (req.method === 'POST' && url.pathname === '/render') {
        let body;
        try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e?.message || String(e) }); }
        const html = String(body.html || '');
        if (!html.trim()) return json(res, 400, { error: 'html is required' });

        // The gate runs BEFORE the queue: refusing early costs nothing, and a banned
        // phrase in a frame cannot be repaired afterwards.
        const inspection = inspectComposition(html);
        if (!inspection.ok && body.force !== true) {
            return json(res, 422, {
                error: 'composition failed the content gate',
                problems: inspection.problems,
                hint: 'fix the copy, or pass force: true only for a deliberate test render',
            });
        }
        if (queue.length >= MAX_QUEUE) {
            return json(res, 503, { error: `render queue is full (${MAX_QUEUE}); retry later` });
        }

        const job = {
            id: randomUUID(), status: 'queued', queuedAt: Date.now(),
            warnings: inspection.ok ? [] : inspection.problems,
        };
        jobs.set(job.id, job);
        queue.push(() => runRender(job, html, body.assets, {
            fps: body.fps, quality: body.quality,
        }));
        pump();
        return json(res, 202, { jobId: job.id, status: job.status, poll: `/render/${job.id}` });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/render/')) {
        const job = jobs.get(url.pathname.slice('/render/'.length));
        if (!job) return json(res, 404, { error: 'unknown job' });
        const { log, outputPath, ...safe } = job;
        return json(res, 200, { ...safe, logTail: (log || '').slice(-1200) });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/outputs/')) {
        const name = basename(url.pathname.slice('/outputs/'.length));
        const path = resolve(RENDERS_DIR, name);
        // Containment check: a crafted name must not read outside the renders directory.
        if (!path.startsWith(resolve(RENDERS_DIR))) return json(res, 400, { error: 'bad path' });
        if (!existsSync(path)) return json(res, 404, { error: 'not found' });
        const buf = await readFile(path);
        res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': buf.length });
        return res.end(buf);
    }

    return json(res, 404, { error: 'no such route' });
});

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => console.log(`[video-renderer] listening on ${PORT}`));
}

export { server, inspectComposition as _inspect };
