import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ArtifactLabelBar } from './ArtifactLabelBar';
import { WHOLE_ARTIFACT_SLIDE } from '../services/judgeRegistry';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: React.ReactElement): HTMLDivElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { createRoot(host).render(el); });
    return host;
}
const byLabel = (host: HTMLElement, label: string) => host.querySelector(`[aria-label="${label}"]`) as HTMLElement;

function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ArtifactLabelBar (IA plan Phase 0 label capture)', () => {
    it('records a whole-artifact label with every joinable id', () => {
        const record = vi.fn();
        const host = mount(<ArtifactLabelBar artifactId="art_1" runId="run_1" messageId="msg_1" record={record} />);
        act(() => { byLabel(host, 'Mark this artifact as wrong').click(); });
        expect(record).toHaveBeenCalledWith(expect.objectContaining({
            artifact_id: 'art_1', run_id: 'run_1', message_id: 'msg_1', slide_id: WHOLE_ARTIFACT_SLIDE, label: 'rejected', source: 'thumbs',
        }));
    });

    it('records the reason as a second label carrying the detail', () => {
        const record = vi.fn();
        const host = mount(<ArtifactLabelBar artifactId="art_2" record={record} />);
        act(() => { byLabel(host, 'Mark this artifact as right').click(); });
        act(() => { typeInto(byLabel(host, 'Reason (optional)') as HTMLInputElement, 'Titles state the judgment'); });
        act(() => { (host.querySelector('button[type="submit"]') as HTMLButtonElement).click(); });
        expect(record).toHaveBeenLastCalledWith(expect.objectContaining({ label: 'approved', detail: 'Titles state the judgment' }));
        expect(host.querySelector('[role="status"]')?.textContent).toBe('Saved with your reason');
    });

    it('sends nothing until the person clicks', () => {
        const record = vi.fn();
        mount(<ArtifactLabelBar artifactId="art_3" record={record} />);
        expect(record).not.toHaveBeenCalled();
    });
});
