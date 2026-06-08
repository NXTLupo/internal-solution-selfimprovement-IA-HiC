import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FreeformArtifact } from '../schemas/freeformArtifact';
import { FREEFORM_A11Y_GUARD } from '../services/freeformSanitizer';

interface Props {
    artifact: FreeformArtifact;
}

const ARTIFACT_W = 1920;
const ARTIFACT_H = 1080;

// 2026-06-03 - Inject the deterministic accessibility contrast guard at RENDER
// time so artifacts persisted BEFORE the sanitizer-side guard (the 23+ stored
// journeys with dark-on-dark active tabs) are corrected on view, without a
// regeneration. Idempotent: the guard's own id prevents double-injection.
function withA11yGuard(html: string): string {
    if (!html || html.includes('nxt-freeform-a11y')) return html;
    if (html.includes('</body>')) return html.replace('</body>', FREEFORM_A11Y_GUARD + '</body>');
    return html + FREEFORM_A11Y_GUARD;
}

/**
 * Renders a freeform-HTML artifact inside a sandboxed iframe at native
 * 1920x1080. The iframe is scaled to fit the container via CSS transform;
 * exports always use native resolution.
 *
 * sandbox="allow-same-origin" - no scripts, no top-nav, no forms - but the
 * host page can still read the iframe's DOM for export. The freeformSanitizer
 * is the primary safety boundary; this is defense-in-depth.
 */
export const FreeformViewer: React.FC<Props> = ({ artifact }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [scale, setScale] = useState(1);

    const recalcScale = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        if (cw === 0 || ch === 0) return;
        const s = Math.min(cw / ARTIFACT_W, ch / ARTIFACT_H);
        setScale(Math.max(s, 0.05));
    }, []);

    useEffect(() => {
        recalcScale();
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => recalcScale());
        ro.observe(el);
        return () => ro.disconnect();
    }, [recalcScale]);

    // The iframe is laid out at native 1920x1080 then `transform: scale()` is
    // applied for visual fit. transform does NOT shrink the layout box, so the
    // visible rendering can extend past the iframe's box. To enforce a true
    // 16:9 envelope, we wrap the iframe in an outer box whose dimensions
    // exactly match the scaled visual size. The outer box clips overflow.
    const scaledW = ARTIFACT_W * scale;
    const scaledH = ARTIFACT_H * scale;

    return (
        <div
            ref={containerRef}
            data-freeform-viewer
            data-artifact-id={artifact.id}
            data-artifact-kind={artifact.kind}
            data-artifact-brand={artifact.brand}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: scaledW,
                    height: scaledH,
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                <iframe
                    ref={iframeRef}
                    title={artifact.title}
                    srcDoc={withA11yGuard(artifact.html)}
                    sandbox="allow-same-origin"
                    style={{
                        width: ARTIFACT_W,
                        height: ARTIFACT_H,
                        border: 0,
                        display: 'block',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                />
            </div>
        </div>
    );
};
