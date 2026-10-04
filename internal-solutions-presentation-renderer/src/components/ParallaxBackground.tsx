import React from 'react';
import type { BrandVariant } from '../types';

interface Props {
  scrollY: number;
  brand?: BrandVariant;
}

const Wrapper: React.FC<{ scrollY: number; speed: number; className?: string; children: React.ReactNode }> = ({ scrollY, speed, className = '', children }) => (
  <div
    style={{ transform: `translateY(${scrollY * speed}px)` }}
    className={`absolute transition-transform duration-100 ease-out ${className}`}
  >
    {children}
  </div>
);

export const ParallaxBackground: React.FC<Props> = ({ scrollY, brand }) => {
  // NU brand presentation = stark white editorial layout. No decorative shapes,
  // no parallax blobs, no SVG accents. Just clean white. Per brand spec —
  // editorial gallery aesthetic, not the maximalist NXT dark-mode look.
  if (brand === 'NU') {
    return null;
  }

  // DECIEM brand presentation = pure black canvas (2026-10-01). A few low-opacity pink / cyan /
  // purple soft shapes (the brand pops, via the [data-brand="DECIEM"] parallax tokens) and one
  // thin white rule. No NXT chartreuse, no gradient diamonds, no accent lines.
  if (brand === 'DECIEM') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          backgroundColor: 'var(--bg-primary, #000000)',
        }}
      >
        <Wrapper scrollY={scrollY} speed={0.05}>
          <div style={{ position: 'absolute', top: '30vh', left: '-15vw', width: '45vw', height: '45vw', borderRadius: '50%', filter: 'blur(120px)', backgroundColor: 'var(--parallax-l1, rgba(251,72,196,0.10))' }} />
          <div style={{ position: 'absolute', top: '150vh', right: '-15vw', width: '40vw', height: '40vw', borderRadius: '50%', filter: 'blur(120px)', backgroundColor: 'var(--parallax-l2, rgba(0,250,204,0.07))' }} />
          <div style={{ position: 'absolute', top: '320vh', left: '10vw', width: '50vw', height: '50vw', borderRadius: '50%', filter: 'blur(120px)', backgroundColor: 'var(--parallax-l3, rgba(138,105,212,0.08))' }} />
        </Wrapper>
        <Wrapper scrollY={scrollY} speed={-0.3}>
          <div style={{ position: 'absolute', top: '60vh', right: '12vw', width: '1px', height: '220px', backgroundColor: 'var(--border-primary, #FFFFFF)', opacity: 0.18 }} />
        </Wrapper>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Layer 1 — deep blurs */}
      <Wrapper scrollY={scrollY} speed={0.05}>
        <div style={{ position: 'absolute', top: '20vh', left: '-20vw', width: '60vw', height: '60vw', borderRadius: '50%', filter: 'blur(96px)', backgroundColor: 'var(--parallax-l1, rgba(184,184,0,0.20))' }} />
        <div style={{ position: 'absolute', top: '120vh', right: '-20vw', width: '50vw', height: '50vw', borderRadius: '50%', filter: 'blur(96px)', backgroundColor: 'var(--parallax-l2, rgba(0,183,195,0.15))' }} />
        <div style={{ position: 'absolute', top: '300vh', left: 0, width: '70vw', height: '70vw', borderRadius: '50%', filter: 'blur(96px)', backgroundColor: 'var(--parallax-l3, rgba(17,80,84,0.20))' }} />
      </Wrapper>

      {/* Layer 2 — mid-ground SVG shapes (gradient brand stops) */}
      <Wrapper scrollY={scrollY} speed={-0.15} className="parallax-mid-1">
        <div style={{ position: 'absolute', top: '80vh', left: '-10vw', opacity: 0.10 }}>
          <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 200 L200 0 L400 200 L200 400 Z" stroke="url(#g1)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--gradient-start, #B8B800)" />
                <stop offset="100%" stopColor="var(--gradient-end, #00B7C3)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Wrapper>
      <Wrapper scrollY={scrollY} speed={0.25} className="parallax-mid-2">
        <div style={{ position: 'absolute', top: '180vh', right: '-5vw', opacity: 0.10 }}>
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="150" r="149" stroke="url(#g2)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-secondary, #00B7C3)" />
                <stop offset="100%" stopColor="var(--gradient-end, #00B7C3)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Wrapper>

      {/* Layer 3 — accent vertical lines */}
      <Wrapper scrollY={scrollY} speed={-0.4}>
        <div style={{ position: 'absolute', top: '50vh', right: '10vw', width: '2px', height: '192px', background: 'linear-gradient(to bottom, var(--accent-primary, #B8B800), transparent)', opacity: 0.20 }} />
      </Wrapper>
      <Wrapper scrollY={scrollY} speed={0.5}>
        <div style={{ position: 'absolute', top: '220vh', left: '5vw', width: '2px', height: '256px', background: 'linear-gradient(to bottom, var(--accent-secondary, #00B7C3), transparent)', opacity: 0.15 }} />
      </Wrapper>
      <Wrapper scrollY={scrollY} speed={-0.3}>
        <div style={{ position: 'absolute', top: '350vh', right: '15vw', width: '2px', height: '160px', background: 'linear-gradient(to bottom, var(--accent-tertiary, #115054), transparent)', opacity: 0.20 }} />
      </Wrapper>
    </div>
  );
};
