import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DesignOptionBoard } from './DesignOptionBoard';
import type { DesignOption } from '../../services/designOptions';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const opt = (id: number, name: string): DesignOption => ({
    id, name, probability: 0.5, layout: `${name} layout`, hierarchy: 'title, exhibit, band', density: 'balanced', imagery: 'native diagram', rationale: 'fits',
    previewHtml: '<div class="opt" style="background:var(--rail)">x</div>',
});

describe('#design option board (WS-E E2)', () => {
    it('Esc closes the comparison without reaching the Design Desk window handler, and a pick reports the option', () => {
        const windowClose = vi.fn();
        // the Design Desk's own handler: bubble phase on window, honors a consumed Esc
        const deskHandler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) windowClose(); };
        window.addEventListener('keydown', deskHandler);
        const onUse = vi.fn();
        const host = document.createElement('div');
        document.body.appendChild(host);
        act(() => { createRoot(host).render(<DesignOptionBoard subject="s" options={[opt(1, 'Strip'), opt(2, 'Matrix')]} tokenCss=":root{--rail:#0D0D0D}" onUse={onUse} />); });
        const compare = host.querySelector('[data-testid="design-compare"]') as HTMLButtonElement;   // jsdom width 0: stacked + compare offered
        expect(compare).toBeTruthy();
        act(() => { compare.click(); });
        expect(host.querySelector('[data-testid="design-compare-overlay"]')).toBeTruthy();
        act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
        expect(host.querySelector('[data-testid="design-compare-overlay"]')).toBeNull();
        expect(windowClose).not.toHaveBeenCalled();
        act(() => { compare.click(); });
        const use2 = Array.from(host.querySelectorAll('[data-testid="design-compare-overlay"] button')).find(b => b.textContent === 'Use option 2') as HTMLButtonElement;
        act(() => { use2.click(); });
        expect(onUse).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'Matrix' }));
        expect(host.querySelector('[data-testid="design-compare-overlay"]')).toBeNull();
        window.removeEventListener('keydown', deskHandler);
    });
});
