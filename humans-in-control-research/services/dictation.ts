/**
 * Voice dictation for the composers (2026-10-31, agent-stack plan WS-E E1, owner decision 6: both paths).
 *
 * Dictation is an INPUT METHOD and nothing more: the spoken words land in the text box the user is already typing
 * in, and the user sends them through the same path as typed text. The citation contract, the gates and the cards
 * are untouched (the plan's REJECT list rules out voice as the generation interface).
 *
 * Path 1, the browser's Web Speech API (`SpeechRecognition`), when present: words stream in as interim text and
 * commit when the recognizer marks them final. Path 2, when the browser has no recognizer: the microphone is
 * recorded (MediaRecorder) and the clip goes through the proxy to the Video Transcription service's Whisper
 * pipeline (`POST /api/transcribe/dictation`), so no provider key reaches the browser.
 */
import { proxyBase } from './proxyConfig';

export type DictationMode = 'speech' | 'recorder' | 'none';
export type DictationState = 'idle' | 'listening' | 'recording' | 'transcribing' | 'error';

/** The slice of the Web Speech API this module uses. */
export interface RecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
    onerror: ((e: { error?: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}

export interface RecorderLike {
    start(): void;
    stop(): Promise<Blob>;
}

export interface DictationDeps {
    recognition?: () => RecognitionLike | null;
    recorder?: () => Promise<RecorderLike | null>;
    transcribe?: (clip: Blob) => Promise<string>;
    hasMicrophone?: () => boolean;
}

export interface DictationHandlers {
    /** Committed words, once per final phrase (speech) or once per clip (recorder). */
    onText: (text: string) => void;
    onInterim?: (text: string) => void;
    onState?: (state: DictationState, detail?: string) => void;
    lang?: string;
}

/** Join dictated words onto what is already typed: one space between, nothing else changed. */
export function appendDictated(current: string, spoken: string): string {
    const said = String(spoken || '').replace(/\s+/g, ' ').trim();
    if (!said) return current;
    const base = String(current || '');
    if (!base.trim()) return said;
    return /\s$/.test(base) ? base + said : `${base} ${said}`;
}

function browserRecognition(): RecognitionLike | null {
    const w = (typeof window !== 'undefined' ? window : {}) as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    return Ctor ? (new Ctor() as RecognitionLike) : null;
}

function browserHasMicrophone(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof (globalThis as any).MediaRecorder !== 'undefined';
}

async function browserRecorder(): Promise<RecorderLike | null> {
    if (!browserHasMicrophone()) return null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const MR = (globalThis as any).MediaRecorder;
    const rec = new MR(stream, MR.isTypeSupported?.('audio/webm') ? { mimeType: 'audio/webm' } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e: any) => { if (e.data?.size) chunks.push(e.data); };
    return {
        start: () => rec.start(),
        stop: () => new Promise<Blob>(resolve => {
            rec.onstop = () => {
                stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
                resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
            };
            rec.stop();
        }),
    };
}

/** Recorded clip -> text through the proxy (which forwards to the Video Transcription service). */
export async function transcribeClip(clip: Blob, fetchImpl: typeof fetch = fetch): Promise<string> {
    const ext = /ogg/.test(clip.type) ? 'ogg' : /mp4|m4a/.test(clip.type) ? 'm4a' : 'webm';
    const r = await fetchImpl(`${proxyBase()}/api/transcribe/dictation?ext=${ext}`, {
        method: 'POST', headers: { 'Content-Type': clip.type || 'audio/webm' }, body: clip, signal: AbortSignal.timeout(150_000),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || `transcription failed (${r.status})`);
    return String(d?.text || '');
}

function browserHasRecognition(): boolean {
    const w = (typeof window !== 'undefined' ? window : {}) as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Which path this browser offers. The browser probe checks for the constructor; it never starts or builds a recognizer
 *  (the button calls this on every render). */
export function dictationMode(deps: DictationDeps = {}): DictationMode {
    try {
        if (deps.recognition ? !!deps.recognition() : browserHasRecognition()) return 'speech';
    } catch { /* no recognizer */ }
    return (deps.hasMicrophone || browserHasMicrophone)() ? 'recorder' : 'none';
}

/**
 * One dictation session per call to start(); stop() ends it. The speech path commits each final phrase as it
 * arrives; the recorder path commits the whole clip once it is transcribed.
 */
export function createDictation(h: DictationHandlers, deps: DictationDeps = {}) {
    const mode = dictationMode(deps);
    let recognition: RecognitionLike | null = null;
    let recorder: RecorderLike | null = null;
    const state = (s: DictationState, detail?: string) => h.onState?.(s, detail);

    async function start(): Promise<void> {
        if (mode === 'speech') {
            recognition = (deps.recognition || browserRecognition)();
            if (!recognition) { state('error', 'speech recognition unavailable'); return; }
            recognition.lang = h.lang || (typeof navigator !== 'undefined' ? navigator.language : '') || 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (e) => {
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const r = e.results[i];
                    const text = r[0]?.transcript || '';
                    if (r.isFinal) h.onText(text); else interim += text;
                }
                h.onInterim?.(interim);
            };
            recognition.onerror = (e) => state('error', e?.error || 'speech recognition error');
            recognition.onend = () => { recognition = null; h.onInterim?.(''); state('idle'); };
            recognition.start();
            state('listening');
            return;
        }
        if (mode === 'recorder') {
            try {
                recorder = await (deps.recorder || browserRecorder)();
            } catch (e: any) {
                state('error', e?.message || 'microphone unavailable');
                return;
            }
            if (!recorder) { state('error', 'microphone unavailable'); return; }
            recorder.start();
            state('recording');
            return;
        }
        state('error', 'this browser offers no speech recognition and no microphone recording');
    }

    async function stop(): Promise<void> {
        if (recognition) { recognition.stop(); return; }
        if (!recorder) return;
        const rec = recorder;
        recorder = null;
        state('transcribing');
        try {
            const clip = await rec.stop();
            const text = await (deps.transcribe || transcribeClip)(clip);
            if (text.trim()) h.onText(text);
            state('idle');
        } catch (e: any) {
            state('error', e?.message || 'transcription failed');
        }
    }

    return { mode, start, stop };
}
