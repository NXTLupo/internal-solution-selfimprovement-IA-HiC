// App.tsx — IFP-style parallax presentation renderer.
//
// Reads slug from /p/{slug}, fetches PresentationPayload, applies brand+theme
// to <html>, renders sections via SECTION_REGISTRY dispatcher with per-section
// scroll-driven scaling, side nav, parallax background, and "Open in Analyst
// Chat" return link at the bottom.

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fetchPayload } from './payloadFetcher';
import type { PresentationPayload, PresentationSection } from './types';
import { ParallaxBackground } from './components/ParallaxBackground';
import { SideNav } from './components/SideNav';
import { SECTION_REGISTRY } from './sections/registry';
import { exportPresentationToPptx } from './services/presentationPptxExporter';

const HIC_SPA_URL = (process.env as { HIC_SPA_URL?: string }).HIC_SPA_URL || 'http://localhost:5011';

/**
 * 2026-05-06 — postMessage origin allowlist for the Phase 3 chat-side
 * `#export-pptx` directive trigger. The chat at the configured HIC_SPA_URL
 * can post `{type: 'nxt:presentation:export-pptx'}` to this window and the
 * renderer will run its export pipeline. Same-window manual button works
 * regardless.
 */
const EXPORT_MSG_TYPE = 'nxt:presentation:export-pptx';
const EXPORT_MSG_READY = 'nxt:presentation:ready';

export const App: React.FC = () => {
  const [payload, setPayload] = useState<PresentationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [exportStatus, setExportStatus] = useState<{ busy: boolean; label: string; error?: string }>({ busy: false, label: '' });

  const slug = useMemo(() => {
    const m = window.location.pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{2,99})\b/i);
    return m ? m[1] : null;
  }, []);

  /**
   * Trigger the multi-slide PPTX export. Walks each section, posts to the
   * proxy, downloads the .pptx. Same handler is invoked by the manual
   * Export button (Phase 1) and by the chat-side postMessage trigger
   * (Phase 3).
   */
  const handleExportPptx = useCallback(async () => {
    if (!payload) return;
    setExportStatus({ busy: true, label: 'Starting export…' });
    try {
      const safeName = (payload.meta.title || 'presentation')
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .substring(0, 60);
      const date = new Date().toISOString().split('T')[0];
      await exportPresentationToPptx({
        filename: `${date}_${safeName}.pptx`,
        onProgress: (frac, label) => {
          setExportStatus({ busy: true, label: `${Math.round(frac * 100)}% · ${label}` });
        },
      });
      setExportStatus({ busy: false, label: 'PPTX downloaded.' });
      setTimeout(() => setExportStatus({ busy: false, label: '' }), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ExportPPTX]', e);
      setExportStatus({ busy: false, label: '', error: msg });
      setTimeout(() => setExportStatus({ busy: false, label: '' }), 6000);
    }
  }, [payload]);

  useEffect(() => {
    if (!slug) {
      setError('No slug in URL. Expected /p/{slug}');
      setLoading(false);
      return;
    }
    fetchPayload(slug)
      .then((p) => {
        document.documentElement.setAttribute('data-brand', p.meta.brand);
        document.documentElement.setAttribute('data-theme', p.meta.theme);
        document.title = p.meta.title || 'Presentation';
        setPayload(p);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  /**
   * 2026-05-06 — Phase 3 postMessage listener. The chat (HiC SPA) can
   * request a PPTX export by posting `{type: EXPORT_MSG_TYPE}` to the
   * presentation window once the user includes #export-pptx in their
   * #presentation directive. Renderer responds with `{type: 'ready'}`
   * when payload has finished loading so the chat knows when to trigger.
   */
  useEffect(() => {
    if (!payload) return;
    // Tell the parent / opener that the renderer is ready to accept commands.
    try { window.opener?.postMessage({ type: EXPORT_MSG_READY, slug }, HIC_SPA_URL); } catch { /* same-origin or no opener */ }
    try { window.parent?.postMessage({ type: EXPORT_MSG_READY, slug }, HIC_SPA_URL); } catch { /* no parent */ }

    const onMessage = (ev: MessageEvent) => {
      if (!ev.data || typeof ev.data !== 'object') return;
      // Accept messages from the configured HIC SPA origin only. Same-window
      // dispatch (window.postMessage to self) has origin === window.origin.
      const allowedOrigins = new Set([HIC_SPA_URL, window.location.origin]);
      if (!allowedOrigins.has(ev.origin)) return;
      if (ev.data.type === EXPORT_MSG_TYPE) {
        handleExportPptx();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [payload, slug, handleExportPptx]);

  // Scroll listener for parallax + active section detection
  useEffect(() => {
    if (!payload) return;
    const onScroll = () => {
      setScrollY(window.scrollY);
      // Active section: find which section's top is closest to viewport center
      const sections = document.querySelectorAll<HTMLElement>('[data-section-index]');
      const center = window.scrollY + window.innerHeight / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      sections.forEach((el) => {
        const top = el.offsetTop;
        const idx = parseInt(el.dataset.sectionIndex || '0', 10);
        const dist = Math.abs(center - (top + el.offsetHeight / 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      setActiveSection(bestIdx);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [payload]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} slug={slug} />;
  if (!payload) return <ErrorScreen message="No payload" slug={slug} />;

  // Filter out sections that have no real content. Defense-in-depth against
  // composer drift: if a section's payload is empty/sparse, drop it rather
  // than render an empty card. Schema-required sections (hero) still render.
  const visibleSections = payload.sections.filter(isSectionRenderable);

  const navItems = visibleSections.map((s, i) => ({
    index: i,
    kind: s.kind,
    label: deriveSectionLabel(s, i),
  }));

  return (
    <main style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <ParallaxBackground scrollY={scrollY} brand={payload.meta.brand} />
      <SideNav items={navItems} activeIndex={activeSection} />

      {visibleSections.map((section, idx) => (
        <SectionWrapper
          key={idx}
          section={section}
          index={idx}
          total={visibleSections.length}
          payload={payload}
        />
      ))}

      {/* Return-to-chat footer + PPTX export */}
      <footer style={{
        padding: '64px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-secondary)',
        backgroundColor: 'var(--bg-primary)',
      }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={`${HIC_SPA_URL}/?engagement=${encodeURIComponent(payload.meta.sourceEngagement || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Open in Analyst Chat ↗
          </a>
          <button
            onClick={handleExportPptx}
            disabled={exportStatus.busy}
            title="Export this presentation as an editable PowerPoint deck (one slide per section, native shapes + text)"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              border: '1px solid var(--accent-primary)',
              backgroundColor: exportStatus.busy ? 'var(--bg-secondary)' : 'var(--accent-primary)',
              color: exportStatus.busy ? 'var(--accent-primary)' : 'var(--bg-primary)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: exportStatus.busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {exportStatus.busy ? '… Exporting' : 'Export PPTX ↓'}
          </button>
        </div>
        {(exportStatus.label || exportStatus.error) && (
          <div style={{
            marginTop: 16,
            fontSize: 11,
            color: exportStatus.error ? '#CC6644' : 'var(--text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace',
            maxWidth: 760,
            margin: '16px auto 0',
            wordBreak: 'break-word' as const,
          }}>
            {exportStatus.error ? `Export failed: ${exportStatus.error}` : exportStatus.label}
          </div>
        )}
        <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
          Composed by {payload.meta.composerModel} · {payload.meta.composerToolCalls} tool calls · {payload.meta.citationCount} citations · {payload.meta.sourceCount.total} sources
        </div>
      </footer>
    </main>
  );
};

// ============================================================================
// SECTION WRAPPER — applies sticky-scroll scaling like IFP per section
// ============================================================================

const SectionWrapper: React.FC<{
  section: PresentationSection;
  index: number;
  total: number;
  payload: PresentationPayload;
}> = ({ section, index, total, payload }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Headline scale: zooms 1.6x → 1x → 0.9x as section enters/exits viewport
  const headlineScale = useTransform(scrollYProgress, [0, 0.3, 0.7], [1.6, 1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.6]);

  const Component = SECTION_REGISTRY[section.kind] || PlaceholderSection;

  return (
    <section
      ref={ref}
      data-section-index={index}
      id={`s-${index}-${section.kind}`}
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: '96px 24px',
        zIndex: 1,
      }}
    >
      <motion.div style={{ opacity, maxWidth: '1440px', margin: '0 auto' }}>
        <Component
          data={section.data as any}
          headlineScale={headlineScale as any}
          index={index}
          total={total}
          payload={payload}
        />
      </motion.div>
    </section>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Drop sections whose data is empty or placeholder-shaped. Defense-in-depth
 * against the composer fabricating empty personas/themes/journey/gap_analysis
 * sections "just to fill space". The prompt also forbids this, but a renderer
 * guard means a single bad payload doesn't ship a deck full of empty cards.
 */
function isSectionRenderable(section: PresentationSection): boolean {
  const d = section.data as Record<string, unknown> | undefined;
  if (!d) return false;
  const kind = section.kind;

  // 2026-05-04 — Switch to a flat conditional chain so each kind is
  // checked exhaustively. The prior nested `if (kind === ...) { if ...
  // return ... }` block fell through for `cta` because the inner-if's
  // `return` only fired when the title-existence test was true; if title
  // was missing the outer block fell out and `return true` at the end
  // let an empty CTA render → CtaSection crashed on undefined title.
  if (kind === 'hero')            return typeof d.title === 'string' && d.title.length > 0;
  if (kind === 'cta')             return typeof d.title === 'string' && d.title.length > 0;
  if (kind === 'context')         return Boolean(d.situation || d.complication || d.resolution);

  // Array-shaped sections — must have at least one item.
  // Recommendations: accept either canonical `recommendations` or synonym `items`.
  if (kind === 'themes')          return Array.isArray(d.themes) && (d.themes as unknown[]).length > 0;
  if (kind === 'evidence')        return Array.isArray(d.stats) && (d.stats as unknown[]).length > 0;
  if (kind === 'quotes')          return Array.isArray(d.quotes) && (d.quotes as unknown[]).length > 0;
  if (kind === 'personas')        return Array.isArray(d.personas) && (d.personas as unknown[]).length > 0;
  if (kind === 'journey')         return Array.isArray(d.stages) && (d.stages as unknown[]).length > 0;
  if (kind === 'recommendations') {
    const recs = (Array.isArray(d.recommendations) ? d.recommendations : Array.isArray(d.items) ? d.items : null);
    return Array.isArray(recs) && (recs as unknown[]).length > 0;
  }
  if (kind === 'roadmap')         return Array.isArray(d.horizons) && (d.horizons as unknown[]).length > 0;
  if (kind === 'gap_analysis')    return Array.isArray(d.gaps) && (d.gaps as unknown[]).length > 0;
  if (kind === 'tech_arch')       return Array.isArray(d.layers) && (d.layers as unknown[]).length > 0;
  if (kind === 'competitive')     return Array.isArray(d.layers) && (d.layers as unknown[]).length > 0;
  if (kind === 'team')            return Array.isArray(d.members) && (d.members as unknown[]).length > 0;

  return true;
}

function deriveSectionLabel(section: PresentationSection, idx: number): string {
  const kindLabels: Record<string, string> = {
    hero: 'Intro',
    context: 'Context',
    themes: 'Themes',
    evidence: 'Evidence',
    quotes: 'Voices',
    personas: 'People',
    journey: 'Journey',
    recommendations: 'Actions',
    roadmap: 'Roadmap',
    gap_analysis: 'Gaps',
    tech_arch: 'Architecture',
    team: 'Team',
    competitive: 'Landscape',
    cta: 'Next Steps',
  };
  return `${String(idx + 1).padStart(2, '0')}. ${kindLabels[section.kind] || section.kind}`;
}

const LoadingScreen: React.FC = () => (
  <div style={loadingStyle}>
    <div style={{ fontSize: '14px', opacity: 0.6, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
      Loading presentation…
    </div>
  </div>
);

const ErrorScreen: React.FC<{ message: string; slug: string | null }> = ({ message, slug }) => (
  <div style={loadingStyle}>
    <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Could not load presentation</h1>
    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', opacity: 0.7 }}>
      slug: {slug ?? '(none)'}{'\n'}error: {message}
    </pre>
  </div>
);

const PlaceholderSection: React.FC<{ data: unknown; index: number; total: number }> = ({ data, index, total }) => (
  <div>
    <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px' }}>
      Section {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · (no renderer registered)
    </div>
    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: '48px',
  textAlign: 'center',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};
