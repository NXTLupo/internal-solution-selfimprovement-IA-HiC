import { describe, it, expect, vi } from 'vitest';
import React, { useCallback, useRef, useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendDictated, createDictation, dictationMode, type RecognitionLike } from './dictation';
import { DictationButton } from '../components/DictationButton';
import { ComposerTextarea } from '../components/ComposerTextarea';


// react-dom directly: the installed @testing-library/react lacks its @testing-library/dom peer
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
function mount(el: React.ReactElement): HTMLDivElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { createRoot(host).render(el); });
    return host;
}
function typeInto(box: HTMLTextAreaElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    act(() => { setter.call(box, value); box.dispatchEvent(new Event('input', { bubbles: true })); });
}

/** A recognizer the test drives by hand. */
function stubRecognizer() {
    const rec: RecognitionLike & { started: boolean; emit: (finals: string[], interim?: string) => void } = {
        lang: '', continuous: false, interimResults: false, onresult: null, onerror: null, onend: null, started: false,
        start() { this.started = true; },
        stop() { this.started = false; this.onend?.(); },
        emit(finals: string[], interim = '') {
            const results: any[] = finals.map(f => Object.assign([{ transcript: f }], { isFinal: true }));
            if (interim) results.push(Object.assign([{ transcript: interim }], { isFinal: false }));
            this.onresult?.({ resultIndex: 0, results });
        },
    };
    return rec;
}

describe('dictation (WS-E E1)', () => {
    it('joins spoken words onto typed text with one space and nothing else', () => {
        expect(appendDictated('', '  narrow the deck  ')).toBe('narrow the deck');
        expect(appendDictated('#slides Revise the last deck.', 'Lead with the CIO view')).toBe('#slides Revise the last deck. Lead with the CIO view');
        expect(appendDictated('ends with space ', 'more')).toBe('ends with space more');
        expect(appendDictated('kept', '   ')).toBe('kept');
    });

    it('the speech path commits final phrases and streams interim text', async () => {
        const rec = stubRecognizer();
        const onText = vi.fn();
        const onInterim = vi.fn();
        const d = createDictation({ onText, onInterim, lang: 'en-US' }, { recognition: () => rec });
        expect(d.mode).toBe('speech');
        await d.start();
        expect(rec.started && rec.continuous && rec.interimResults && rec.lang === 'en-US').toBe(true);
        rec.emit([], 'narrow');
        expect(onInterim).toHaveBeenLastCalledWith('narrow');
        rec.emit(['narrow the scope to the onboarding module']);
        expect(onText).toHaveBeenCalledWith('narrow the scope to the onboarding module');
        await d.stop();
        expect(rec.started).toBe(false);
    });

    it('without a recognizer the clip is recorded and transcribed through the proxy path', async () => {
        const clip = new Blob(['audio'], { type: 'audio/webm' });
        const transcribe = vi.fn(async () => 'add a slide on vendor risk');
        const onText = vi.fn();
        const states: string[] = [];
        const d = createDictation({ onText, onState: s => states.push(s) }, {
            recognition: () => null, hasMicrophone: () => true,
            recorder: async () => ({ start: () => undefined, stop: async () => clip }), transcribe,
        });
        expect(d.mode).toBe('recorder');
        await d.start();
        await d.stop();
        expect(transcribe).toHaveBeenCalledWith(clip);
        expect(onText).toHaveBeenCalledWith('add a slide on vendor risk');
        expect(states).toEqual(['recording', 'transcribing', 'idle']);
    });

    it('no recognizer and no microphone means no button', () => {
        const deps = { recognition: () => null, hasMicrophone: () => false };
        expect(dictationMode(deps)).toBe('none');
        const host = mount(<DictationButton onDictated={() => undefined} deps={deps} />);
        expect(host.innerHTML).toBe('');
    });

    it('a dictated revision reaches the send call unchanged', async () => {
        const rec = stubRecognizer();
        const sendChatMessage = vi.fn();
        // The panel's composer contract: external writes go through setInput (live DOM value + a sync bump), and
        // send reads the composer's live DOM value (CorpusChatPanel handleSend).
        const Harness: React.FC = () => {
            const inputRef = useRef<HTMLTextAreaElement>(null);
            const [input, setInputState] = useState('');
            const [sync, setSync] = useState(0);
            const setInput = useCallback((v: (prev: string) => string) => {
                setInputState(prev => v((inputRef.current?.value ?? prev) as string));
                setSync(n => n + 1);
            }, []);
            return (
                <div>
                    <ComposerTextarea inputRef={inputRef} value={input} sync={sync} onValueChange={setInputState} onKeyDown={() => undefined} />
                    <DictationButton deps={{ recognition: () => rec }} onDictated={spoken => setInput(prev => appendDictated(prev, spoken))} />
                    <button type="button" onClick={() => sendChatMessage(String(inputRef.current?.value ?? input).trim())}>Send</button>
                </div>
            );
        };
        const host = mount(<Harness />);
        const box = host.querySelector('textarea') as HTMLTextAreaElement;
        const mic = host.querySelector('[data-testid="dictation-button"]') as HTMLButtonElement;
        typeInto(box, '#slides Revise the last deck.');
        await act(async () => { mic.click(); });
        await act(async () => { rec.emit(['Keep the cover, drop slide four and lead with the CIO view.']); });
        await act(async () => { mic.click(); });
        expect(box.value).toBe('#slides Revise the last deck. Keep the cover, drop slide four and lead with the CIO view.');
        act(() => { (Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Send') as HTMLButtonElement).click(); });
        expect(sendChatMessage).toHaveBeenCalledWith('#slides Revise the last deck. Keep the cover, drop slide four and lead with the CIO view.');
    });

    it('the panel wires the button through the same composer write and send path', () => {
        const panel = readFileSync(join(__dirname, '..', 'components', 'CorpusChatPanel.tsx'), 'utf8');
        expect(panel).toContain('<DictationButton onDictated={spoken => setInput(prev => appendDictated(prev, spoken))} />');
        expect(panel).toContain('let query = queryOverride || String(inputRef.current?.value ?? input).trim();');
        expect(panel).toContain("import { ComposerTextarea } from './ComposerTextarea';");
    });
});
