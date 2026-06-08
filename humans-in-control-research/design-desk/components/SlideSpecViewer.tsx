/**
 * SlideSpecViewer - paints a SlideSpec to HTML/SVG inside a sandboxed
 * iframe-equivalent at native 1920×1080, scaled to fit the container.
 *
 * Reads the same SlideSpec the PPTX emitter reads. Both renderers stay in
 * sync because they share a single source of truth.
 *
 * Brand chrome (atmospheric overlays, grain, brand seal, eyebrow ::before
 * lines, gradients) is applied by THIS RENDERER as decoration - it does
 * NOT live in the spec. The PPTX emitter omits the chrome (flat clean
 * minimal per user direction). Result: canvas preview is rich and
 * brand-decorated; PPTX export is flat + native shapes.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { SlideSpec, SlideObject } from '../schemas/slideSpec';
import type { BrandHashtag } from '../services/hashtagParser';

interface Props {
    spec: SlideSpec;
    brand: BrandHashtag;
    artifactId: string;
    artifactKind: string;
}

const NATIVE_W = 1920;
const NATIVE_H = 1080;

// Slide inches → native pixels
function inToPx(inches: number, dim: 'w' | 'h'): number {
    const slidePx = dim === 'w' ? NATIVE_W : NATIVE_H;
    const slideIn = dim === 'w' ? 13.333 : 7.5;
    return (inches / slideIn) * slidePx;
}

// ---------------------------------------------------------------------------
// Brand chrome - atmospheric overlays + grain + brand seal + eyebrow rules
// ---------------------------------------------------------------------------

interface BrandTokens {
    paper: string;
    primary: string;
    accent: string;
    secondary: string;
    muted: string;
    sealLetter: string;
    sealBg: string;
    sealColor: string;
    atmosphere1: string; // CSS gradient
    atmosphere2: string;
}

const NU_TOKENS: BrandTokens = {
    paper: '#FAF8F4',
    primary: '#0A0A0A',
    accent: '#C8102E',
    secondary: '#6E54E0',
    muted: '#5C5C5C',
    sealLetter: 'N',
    sealBg: '#C8102E',
    sealColor: '#FFFFFF',
    atmosphere1: 'radial-gradient(circle at center, rgba(110,84,224,0.12) 0%, transparent 65%)',
    atmosphere2: 'radial-gradient(circle at center, rgba(200,16,46,0.07) 0%, transparent 55%)',
};

const NXT_TOKENS: BrandTokens = {
    paper: '#FFFFFF',
    primary: '#0D0D0D',
    accent: '#B8B800',
    secondary: '#00B7C3',
    muted: '#666666',
    sealLetter: 'N',
    sealBg: '#0D0D0D',
    sealColor: '#B8B800',
    atmosphere1: 'radial-gradient(circle at center, rgba(184,184,0,0.10) 0%, transparent 60%)',
    atmosphere2: 'radial-gradient(circle at center, rgba(0,183,195,0.08) 0%, transparent 55%)',
};

function tokensFor(brand: BrandHashtag): BrandTokens {
    return brand === 'nu' ? NU_TOKENS : NXT_TOKENS;
}

// ---------------------------------------------------------------------------
// Object → React node
// ---------------------------------------------------------------------------

function renderObject(obj: SlideObject, key: number): React.ReactNode {
    switch (obj.type) {
        case 'text':  return renderText(obj, key);
        case 'shape': return renderShape(obj, key);
        case 'line':  return renderLine(obj, key);
        case 'image': return renderImage(obj, key);
    }
}

function renderText(o: import('../schemas/slideSpec').TextObject, key: number): React.ReactNode {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: inToPx(o.x, 'w'),
        top: inToPx(o.y, 'h'),
        width: inToPx(o.w, 'w'),
        height: inToPx(o.h, 'h'),
        textAlign: o.align,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: o.valign === 'middle' ? 'center' : o.valign === 'bottom' ? 'flex-end' : 'flex-start',
        whiteSpace: 'nowrap',
        overflow: 'visible',
        pointerEvents: 'none',
    };
    return (
        <div key={`t${key}`} style={style}>
            <div style={{ width: '100%' }}>
                {o.runs.map((r, i) => (
                    <span
                        key={i}
                        style={{
                            fontFamily: r.fontFamily ?? 'Archivo, sans-serif',
                            fontSize: r.fontSize ? r.fontSize * 1.333 : 14,  // pt → px
                            fontWeight: r.bold ? 800 : 400,
                            fontStyle: r.italic ? 'italic' : 'normal',
                            textDecoration: r.underline ? 'underline' : 'none',
                            color: r.color ? `#${r.color}` : '#0A0A0A',
                            letterSpacing: r.charSpacing ? `${r.charSpacing / 10}px` : 'normal',
                        }}
                    >
                        {r.text}
                    </span>
                ))}
            </div>
        </div>
    );
}

function renderShape(o: import('../schemas/slideSpec').ShapeObject, key: number): React.ReactNode {
    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: inToPx(o.x, 'w'),
        top: inToPx(o.y, 'h'),
        width: inToPx(o.w, 'w'),
        height: inToPx(o.h, 'h'),
        background: o.fill ? `#${o.fill}` : 'transparent',
        opacity: o.fillAlpha ?? 1,
        border: o.line && o.lineWidth > 0 ? `${o.lineWidth * 1.333}px ${o.lineDash === 'dash' ? 'dashed' : o.lineDash === 'sysDot' ? 'dotted' : 'solid'} #${o.line}` : 'none',
        boxSizing: 'border-box',
        pointerEvents: 'none',
    };
    if (o.shape === 'roundRect' && o.cornerRadius) {
        baseStyle.borderRadius = inToPx(o.cornerRadius, 'w');
    } else if (o.shape === 'ellipse') {
        baseStyle.borderRadius = '50%';
    }
    return <div key={`s${key}`} style={baseStyle} />;
}

function renderLine(o: import('../schemas/slideSpec').LineObject, key: number): React.ReactNode {
    const x1 = inToPx(o.x1, 'w');
    const y1 = inToPx(o.y1, 'h');
    const x2 = inToPx(o.x2, 'w');
    const y2 = inToPx(o.y2, 'h');
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.abs(x2 - x1) + 4;
    const h = Math.abs(y2 - y1) + 4;
    const dash = o.dash === 'dash' ? '8 4' : o.dash === 'sysDot' ? '2 4' : o.dash === 'dashDot' ? '8 4 2 4' : 'none';
    return (
        <svg
            key={`l${key}`}
            style={{ position: 'absolute', left: minX - 2, top: minY - 2, width: w, height: h, pointerEvents: 'none', overflow: 'visible' }}
            viewBox={`${minX - 2} ${minY - 2} ${w} ${h}`}
        >
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={`#${o.color}`}
                strokeWidth={o.width * 1.333}
                strokeDasharray={dash !== 'none' ? dash : undefined}
                markerEnd={o.arrowEnd ? 'url(#arrow-end)' : undefined}
                markerStart={o.arrowStart ? 'url(#arrow-start)' : undefined}
            />
            {(o.arrowEnd || o.arrowStart) && (
                <defs>
                    {o.arrowEnd && (
                        <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill={`#${o.color}`} />
                        </marker>
                    )}
                    {o.arrowStart && (
                        <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 10 0 L 0 5 L 10 10 z" fill={`#${o.color}`} />
                        </marker>
                    )}
                </defs>
            )}
        </svg>
    );
}

function renderImage(o: import('../schemas/slideSpec').ImageObject, key: number): React.ReactNode {
    return (
        <img
            key={`i${key}`}
            src={o.src}
            alt=""
            style={{
                position: 'absolute',
                left: inToPx(o.x, 'w'),
                top: inToPx(o.y, 'h'),
                width: inToPx(o.w, 'w'),
                height: inToPx(o.h, 'h'),
                pointerEvents: 'none',
            }}
        />
    );
}

// ---------------------------------------------------------------------------
// Brand chrome decoration (atmospheric overlays + grain)
// ---------------------------------------------------------------------------

function BrandChrome({ tokens }: { tokens: BrandTokens }): React.ReactElement {
    return (
        <>
            <div style={{
                position: 'absolute',
                top: -250, right: -250,
                width: 700, height: 700,
                background: tokens.atmosphere1,
                pointerEvents: 'none',
                filter: 'blur(20px)',
            }} />
            <div style={{
                position: 'absolute',
                bottom: -350, left: -250,
                width: 700, height: 700,
                background: tokens.atmosphere2,
                pointerEvents: 'none',
                filter: 'blur(30px)',
            }} />
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                opacity: 0.022,
                pointerEvents: 'none',
                mixBlendMode: 'multiply',
            }} />
        </>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SlideSpecViewer: React.FC<Props> = ({ spec, brand, artifactId, artifactKind }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const recalcScale = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        if (cw === 0 || ch === 0) return;
        setScale(Math.max(Math.min(cw / NATIVE_W, ch / NATIVE_H), 0.05));
    }, []);

    useEffect(() => {
        recalcScale();
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => recalcScale());
        ro.observe(el);
        return () => ro.disconnect();
    }, [recalcScale]);

    const tokens = tokensFor(brand);
    const objects = useMemo(() => spec.objects.map((obj, i) => renderObject(obj, i)), [spec.objects]);

    const scaledW = NATIVE_W * scale;
    const scaledH = NATIVE_H * scale;

    return (
        <div
            ref={containerRef}
            data-slide-viewer
            data-artifact-id={artifactId}
            data-artifact-kind={artifactKind}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1A1A1A',
            }}
        >
            <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
                <div
                    style={{
                        width: NATIVE_W,
                        height: NATIVE_H,
                        background: `#${spec.background}`,
                        position: 'relative',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        overflow: 'hidden',
                        fontFamily: "'Archivo', sans-serif",
                        color: tokens.primary,
                    }}
                >
                    <BrandChrome tokens={tokens} />
                    {objects}
                </div>
            </div>
        </div>
    );
};
