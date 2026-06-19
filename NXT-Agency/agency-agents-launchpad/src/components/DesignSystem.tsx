import { X, Palette, Type, Layout, Square, MousePointer, Layers } from 'lucide-react';

interface DesignSystemProps {
  onClose: () => void;
}

const colors = [
  { name: 'White', hex: '#ffffff', var: '--nxt-white', usage: 'Primary surface' },
  { name: 'Off White', hex: '#fafafa', var: '--nxt-bg-secondary', usage: 'Secondary surface, cards' },
  { name: 'Light Gray', hex: '#f5f5f5', var: '--nxt-bg-tertiary', usage: 'Tertiary surface, inputs' },
  { name: 'Teal', hex: '#115054', var: '--nxt-teal', usage: 'Primary brand, button text on lime' },
  { name: 'Lime', hex: '#caca20', var: '--nxt-lime', usage: 'CTAs, accents, active states' },
  { name: 'Orange', hex: '#fd8e2e', var: '--nxt-orange', usage: 'Accent highlights' },
  { name: 'Dark Text', hex: '#141414', var: '--nxt-text', usage: 'Primary text' },
  { name: 'Secondary Text', hex: '#525252', var: '--nxt-text-secondary', usage: 'Body text, descriptions' },
  { name: 'Muted Text', hex: '#acacac', var: '--nxt-text-muted', usage: 'Labels, captions' },
  { name: 'Border', hex: '#e5e5e5', var: '--nxt-border', usage: 'Subtle borders' },
];

const typeScale = [
  { name: 'H1', font: 'Archivo', weight: 200, size: '72px', usage: 'Page headings' },
  { name: 'H2', font: 'Archivo', weight: 200, size: '52px', usage: 'Section headings' },
  { name: 'H3', font: 'Archivo', weight: 200, size: '44px', usage: 'Subsection headings' },
  { name: 'H4', font: 'Archivo', weight: 500, size: '21px', usage: 'Form subtitles' },
  { name: 'Body', font: 'Archivo', weight: 300, size: '18px', usage: 'Body text' },
  { name: 'Body SM', font: 'Archivo', weight: 300, size: '16px', usage: 'Small text, nav' },
  { name: 'Caption', font: 'Archivo', weight: 300, size: '12px', usage: 'Labels, captions' },
  { name: 'Button', font: 'Archivo', weight: 700, size: '12px', usage: 'Button text, uppercase' },
];

const spacing = [
  { name: 'XXS', value: '4px', usage: 'Tight inline grouping' },
  { name: 'XS', value: '8px', usage: 'Label gaps, icon gaps' },
  { name: 'SM', value: '12px', usage: 'Small component gaps' },
  { name: 'MD', value: '16px', usage: 'Button padding, medium spacing' },
  { name: 'LG', value: '24px', usage: 'Form fields, header padding' },
  { name: 'XL', value: '64px', usage: 'Content block spacing' },
  { name: 'XXL', value: '72px', usage: 'Panel text groups' },
  { name: '3XL', value: '112px', usage: 'Section group spacing' },
];

const components = [
  { name: 'Primary Button', class: '.nxt-btn-primary', desc: 'Lime bg, teal text, 48px height, 2px radius, uppercase 12px bold, no shadow', preview: 'bg-[#caca20] text-[#115054]' },
  { name: 'Secondary Button', class: '.nxt-btn-secondary', desc: 'White bg, border #e5e5e5, dark text, 48px height, 2px radius', preview: 'bg-white text-[#141414] border border-[#e5e5e5]' },
  { name: 'Input Field', class: '.nxt-input', desc: 'White bg, 56px height, #e5e5e5 border, 2px radius', preview: 'bg-white border border-[#e5e5e5] text-[#141414]' },
  { name: 'Card', class: '.nxt-card', desc: 'White bg, #e5e5e5 border, 4px radius, no shadow', preview: 'bg-white border border-[#e5e5e5]' },
  { name: 'Nav Bar', class: '.nxt-nav', desc: 'White bg, 4px radius, border bottom', preview: 'bg-white border-b border-[#e5e5e5]' },
  { name: 'Tertiary Surface', class: '.nxt-surface', desc: '#f5f5f5 bg, #e5e5e5 border, flat appearance', preview: 'bg-[#f5f5f5] border border-[#e5e5e5]' },
];

export function DesignSystem({ onClose }: DesignSystemProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white fade-in overflow-hidden" role="dialog" aria-modal="true" aria-label="NXT Humans 2026 Stark White Design System">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-nxt-border bg-white shrink-0">
        <div className="w-10 h-10 rounded-[4px] flex items-center justify-center bg-nxt-teal/10">
          <Palette size={20} className="text-nxt-teal" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-medium text-nxt-text">NXT Humans 2026 Stark White Design System</h1>
          <p className="text-[11px] text-nxt-text-muted font-light">
            Surfaces: #fff / #fafafa / #f5f5f5 -- No shadows -- 4px card radius -- 2px button radius
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[2px] flex items-center justify-center bg-nxt-bg-tertiary hover:bg-nxt-lime hover:text-nxt-teal border border-nxt-border transition-colors"
          aria-label="Close design system"
        >
          <X size={16} className="text-nxt-text-secondary" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">

          {/* Colors */}
          <section aria-labelledby="ds-colors">
            <div className="flex items-center gap-2 mb-6">
              <Palette size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-colors" className="text-lg font-extralight text-nxt-text">Color Palette</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {colors.map((c) => (
                <div key={c.hex + c.name} className="group">
                  <div
                    className="w-full h-20 rounded-[4px] border border-nxt-border mb-2 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: c.hex }}
                  />
                  <p className="text-xs font-medium text-nxt-text">{c.name}</p>
                  <p className="text-[11px] font-mono text-nxt-teal">{c.hex}</p>
                  <p className="text-[10px] text-nxt-text-muted font-light mt-0.5">{c.usage}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section aria-labelledby="ds-type">
            <div className="flex items-center gap-2 mb-6">
              <Type size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-type" className="text-lg font-extralight text-nxt-text">Typography</h2>
            </div>
            <div className="space-y-4">
              {typeScale.map((t) => (
                <div key={t.name} className="flex items-baseline gap-4 py-3 border-b border-nxt-border/50">
                  <span className="w-32 shrink-0 text-xs font-bold text-nxt-teal uppercase tracking-wider">{t.name}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-nxt-text font-light truncate">
                      {t.font} &middot; {t.weight} &middot; {t.size}
                    </p>
                    <p className="text-[11px] text-nxt-text-muted font-light">{t.usage}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-[4px] bg-nxt-bg-tertiary border border-nxt-border">
              <p className="text-[11px] text-nxt-text-muted font-light">
                <strong className="text-nxt-text">Font family:</strong> Archivo (all UI, weights 200-700) -- Headings weight 200, body weight 300, buttons weight 700
              </p>
            </div>
          </section>

          {/* Spacing */}
          <section aria-labelledby="ds-spacing">
            <div className="flex items-center gap-2 mb-6">
              <Layout size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-spacing" className="text-lg font-extralight text-nxt-text">Spacing Scale</h2>
            </div>
            <div className="space-y-2">
              {spacing.map((s) => (
                <div key={s.name} className="flex items-center gap-4">
                  <span className="w-12 text-xs font-bold text-nxt-teal uppercase tracking-wider">{s.name}</span>
                  <div className="h-4 rounded-[1px] bg-nxt-teal/20" style={{ width: s.value }} />
                  <span className="text-xs font-mono text-nxt-text-secondary">{s.value}</span>
                  <span className="text-[11px] text-nxt-text-muted font-light">{s.usage}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Components */}
          <section aria-labelledby="ds-components">
            <div className="flex items-center gap-2 mb-6">
              <Square size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-components" className="text-lg font-extralight text-nxt-text">Components</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {components.map((c) => (
                <div key={c.name} className="p-4 rounded-[4px] bg-nxt-bg-secondary border border-nxt-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointer size={12} className="text-nxt-teal" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-nxt-text">{c.name}</h3>
                  </div>
                  <p className="text-[11px] font-mono text-nxt-teal mb-2">{c.class}</p>
                  <p className="text-xs text-nxt-text-muted font-light mb-3">{c.desc}</p>
                  {/* Live preview */}
                  <div className="p-3 rounded-[4px] bg-white border border-nxt-border flex items-center justify-center">
                    {c.name.includes('Button') ? (
                      <div className={`px-6 py-3 rounded-[2px] text-xs font-bold uppercase tracking-wider ${c.preview}`}>
                        {c.name === 'Primary Button' ? 'SUBMIT' : 'CANCEL'}
                      </div>
                    ) : c.name === 'Input Field' ? (
                      <div className={`w-full h-14 px-4 flex items-center rounded-[2px] text-sm font-light ${c.preview}`}>
                        <span className="text-[#acacac]">Placeholder text...</span>
                      </div>
                    ) : c.name === 'Card' ? (
                      <div className={`w-full p-4 rounded-[4px] ${c.preview}`}>
                        <p className="text-xs text-nxt-text-secondary font-light">Card content</p>
                      </div>
                    ) : c.name === 'Nav Bar' ? (
                      <div className={`w-full px-4 py-3 rounded-[4px] flex items-center justify-between ${c.preview}`}>
                        <span className="text-xs font-bold text-nxt-text tracking-wider">NXT HUMANS</span>
                        <span className="px-3 py-1.5 rounded-[2px] bg-[#caca20] text-[#115054] text-[10px] font-bold uppercase">CONTACT</span>
                      </div>
                    ) : (
                      <div className={`w-full p-6 rounded-[4px] ${c.preview}`}>
                        <p className="text-xs text-nxt-text-muted font-light">Surface content</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Key Dimensions */}
          <section aria-labelledby="ds-dimensions">
            <div className="flex items-center gap-2 mb-6">
              <Layers size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-dimensions" className="text-lg font-extralight text-nxt-text">Key Dimensions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Viewport', value: '1440px' },
                { label: 'Section', value: '1440 x 1056px' },
                { label: 'Content', value: '920px' },
                { label: 'Form', value: '448px' },
                { label: 'Button Height', value: '48px' },
                { label: 'Input Height', value: '56px' },
                { label: 'Button Radius', value: '2px' },
                { label: 'Card Radius', value: '4px' },
              ].map((d) => (
                <div key={d.label} className="p-3 rounded-[4px] bg-nxt-bg-secondary border border-nxt-border text-center">
                  <p className="text-lg font-mono text-nxt-teal">{d.value}</p>
                  <p className="text-[10px] text-nxt-text-muted uppercase tracking-wider font-bold mt-1">{d.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Visual Language */}
          <section className="pb-8" aria-labelledby="ds-visual">
            <div className="flex items-center gap-2 mb-6">
              <Palette size={16} className="text-nxt-teal" aria-hidden="true" />
              <h2 id="ds-visual" className="text-lg font-extralight text-nxt-text">Visual Language</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'No Shadows', desc: 'All depth via borders and background layering. Never use box-shadow.' },
                { title: 'Stark White Surfaces', desc: '#ffffff primary, #fafafa secondary, #f5f5f5 tertiary. Clean, minimal.' },
                { title: 'Minimal Radius', desc: '2px for buttons/inputs, 4px for cards/panels.' },
                { title: 'Light-First', desc: 'Dark text (#141414, #525252) on white backgrounds. Teal/lime accents.' },
                { title: 'Subtle Borders', desc: '#e5e5e5 for subtle, #d4d4d4 for medium emphasis. 1px solid.' },
                { title: 'Brand Accents', desc: 'Lime #caca20 for CTAs. Teal #115054 for brand identity. Orange #fd8e2e for highlights.' },
              ].map((v) => (
                <div key={v.title} className="p-4 rounded-[4px] bg-nxt-bg-secondary border border-nxt-border">
                  <h3 className="text-sm font-medium text-nxt-text mb-1">{v.title}</h3>
                  <p className="text-xs text-nxt-text-muted font-light">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
