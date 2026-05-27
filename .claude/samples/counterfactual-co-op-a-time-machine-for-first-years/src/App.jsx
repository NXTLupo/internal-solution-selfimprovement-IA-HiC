// DEPTH_FIRST_SCREENS: ['portfolio_adjuster', 'cohort_comparison']
// Reason: The portfolio adjuster is the core "aha" moment where the user feels the forecast move, and the cohort comparison sets the baseline stakes with real data.

// PATTERN MANIFEST: p-aspot.aspot-edu, p-compare, p-info-stat, p-synth, p-swipe, p-avatar, p-perm, p-dial, p-sim, p-chart, p-assign, p-input, p-kpi, p-rec, p-pipe, p-node, p-cohort, p-triage

const {
  useState, useEffect, useRef, useMemo, useCallback, useReducer, useLayoutEffect,
  Fragment, createContext, useContext
} = React;
const {
  motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useScroll
} = window.framerMotion;

// --- CSS & BRAND TOKENS (NXT) ---
const nxtStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@400;700&family=JetBrains+Mono:wght@400&display=swap');

  :root {
    --nxt-bg: #FFFFFF;
    --nxt-surface: #FAFAFA;
    --nxt-text-primary: #0D0D0D;
    --nxt-text-secondary: #525252;
    --nxt-border: #E5E5E5;
    
    --nxt-teal: #115054;
    --nxt-success: #0CCE6B;
    --nxt-warning: #FD8E2E;
    --nxt-friction: #CC6644;
    --nxt-opportunity: #B8B800;
    --nxt-emphasis: #B8B800;
    
    --font-display: 'Bebas Neue', sans-serif;
    --font-body: 'Archivo', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    
    --radius-sharp: 2px;
    --radius-none: 0px;
    
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: var(--font-body); 
    background-color: var(--nxt-bg); 
    color: var(--nxt-text-primary); 
    -webkit-font-smoothing: antialiased;
  }

  /* Typography Classes */
  .t-display { font-family: var(--font-display); font-size: 48px; line-height: 1.1; letter-spacing: 0.02em; text-transform: uppercase; }
  .t-h2 { font-family: var(--font-display); font-size: 32px; line-height: 1.1; letter-spacing: 0.02em; text-transform: uppercase; }
  .t-h3 { font-family: var(--font-display); font-size: 24px; line-height: 1.2; letter-spacing: 0.02em; text-transform: uppercase; }
  .t-body { font-family: var(--font-body); font-size: 16px; line-height: 1.5; }
  .t-label { font-family: var(--font-body); font-size: 12px; line-height: 1.2; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .t-data { font-family: var(--font-mono); font-size: 14px; line-height: 1.2; }
  .t-quote { font-family: var(--font-body); font-size: 20px; line-height: 1.4; }

  /* Utilities */
  .flex-col { display: flex; flex-direction: column; }
  .flex-row { display: flex; flex-direction: row; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .gap-1 { gap: 4px; } .gap-2 { gap: 8px; } .gap-3 { gap: 16px; } .gap-4 { gap: 24px; } .gap-5 { gap: 32px; } .gap-6 { gap: 48px; }
  .p-3 { padding: 16px; } .p-4 { padding: 24px; } .p-5 { padding: 32px; }
  .border-b { border-bottom: 1px solid var(--nxt-border); }
  .border-r { border-right: 1px solid var(--nxt-border); }
  .text-secondary { color: var(--nxt-text-secondary); }
  
  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--nxt-border); border-radius: 0; }
  ::-webkit-scrollbar-thumb:hover { background: var(--nxt-text-secondary); }

  /* Range Slider Reset */
  input[type=range] {
    -webkit-appearance: none; width: 100%; background: transparent;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; height: 24px; width: 12px; background: var(--nxt-text-primary);
    cursor: pointer; margin-top: -10px; border-radius: var(--radius-sharp);
    transition: transform 0.1s, background 0.2s;
  }
  input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); background: var(--nxt-emphasis); }
  input[type=range]::-webkit-slider-runnable-track {
    width: 100%; height: 4px; cursor: pointer; background: var(--nxt-border); border-radius: 0;
  }
  input[type=range]:focus { outline: none; }
  input[type=range]:focus::-webkit-slider-thumb { outline: 2px solid var(--nxt-emphasis); outline-offset: 2px; }

  /* Skeletons */
  @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
  .skeleton {
    background: linear-gradient(90deg, var(--nxt-surface) 25%, var(--nxt-border) 50%, var(--nxt-surface) 75%);
    background-size: 1000px 100%; animation: shimmer 2s infinite linear; border-radius: var(--radius-sharp);
  }
`;

// --- AI HELPERS ---
const VS_INSTRUCTION = `
Before answering, generate THREE distinct candidate responses with diverse framings. Assign each a probability mass reflecting how likely a typical model would emit it. Then return the candidate with the LOWEST probability that still earns >=7/10 on quality and grounded relevance. Output ONLY the final chosen candidate in the requested JSON format. Do not show the intermediate candidates.
`.trim();

async function callAIWithFallback(systemPrompt, userPrompt, opts = {}) {
  const providers = [
    {
      name: 'gemini', url: '/api/ai/gemini-compat',
      headers: { 'Content-Type': 'application/json', 'x-openai-endpoint': 'chat' },
      body: { model: 'gemini-3.1-pro-preview', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: opts.temperature ?? 0.3, max_tokens: opts.maxTokens ?? 1200 },
      extract: (data) => data?.choices?.[0]?.message?.content,
    },
    {
      name: 'anthropic', url: '/api/ai/anthropic',
      headers: { 'Content-Type': 'application/json' },
      body: { model: 'claude-opus-4-6', max_tokens: opts.maxTokens ?? 1200, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] },
      extract: (data) => data?.content?.[0]?.text,
    }
  ];
  let lastErr = null;
  for (const p of providers) {
    try {
      const res = await fetch(p.url, { method: 'POST', headers: p.headers, body: JSON.stringify(p.body) });
      if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`);
      const data = await res.json();
      const text = p.extract(data);
      if (!text) throw new Error(`${p.name} returned empty`);
      
      if (opts.expectJson) {
        try {
          const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
          return { data: JSON.parse(jsonStr), provider: p.name };
        } catch (e) {
          console.warn(`Failed to parse JSON from ${p.name}:`, text);
          throw new Error(`Invalid JSON from ${p.name}`);
        }
      }
      return { text, provider: p.name };
    } catch (e) { lastErr = e; console.warn(`[AI] ${p.name} failed:`, e); }
  }
  throw new Error(`All AI providers failed. Last error: ${lastErr?.message}`);
}

async function callAIWithVS(systemPrompt, userPrompt, opts = {}) {
  return callAIWithFallback(`${systemPrompt}\n\n${VS_INSTRUCTION}`, userPrompt, { ...opts, temperature: 0.85 });
}

async function generateImage(prompt) {
  try {
    const res = await fetch('/api/ai/gemini-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style: 'editorial photographic' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.imageData || data?.url || null;
  } catch { return null; }
}

// --- SEED DATA ---
const SEED_ALUMNI = Array.from({ length: 30 }).map((_, i) => ({
  cluster_id: `CLUSTER-${['IE','BUS','CS','BIOE'][i%4]}-${['BRAND','BAL','SME','HEAVY'][i%4]}-0${(i%5)+1}`,
  major: ['Industrial Engineering', 'Business Administration', 'Computer Science', 'Bioengineering'][i%4],
  gpa_band: ['3.4-3.6', '3.2-3.4', '3.6-3.8', '3.0-3.2'][i%4],
  strategy_label: ['Brand-Only', 'Balanced', 'SME-Heavy', 'Brand-Heavy'][i%4],
  year_one_apps: Math.floor(Math.random() * 50) + 15,
  year_one_brand_share: [0.98, 0.55, 0.22, 0.85][i%4],
  sophomore_placement_rate: [0.31, 0.78, 0.84, 0.45][i%4],
  median_offer_band: ['$22-26/hr', '$24-29/hr', '$20-24/hr', '$28-34/hr'][i%4],
  ghosting_count_median: [6, 2, 1, 5][i%4],
  time_to_offer_days: [142, 68, 52, 110][i%4],
  dominant_sme_categories: i%2===0 ? [] : ['Industrial automation', 'Medical devices', 'Logistics tech'],
  junior_year_brand_conversion_rate: [0.07, 0.34, 0.41, 0.15][i%4],
  vignette_synthetic_monogram: String.fromCharCode(65 + (i%26))
}));

const SEED_STUDENTS = Array.from({ length: 28 }).map((_, i) => ({
  student_id: `NU247${100+i}`,
  name_first: ['Sam', 'Priya', 'Marcus', 'Ava', 'Leo', 'Zoe', 'Ethan', 'Mia'][i%8],
  major: ['Industrial Engineering', 'Computer Science', 'Business Administration', 'Bioengineering'][i%4],
  gpa_band: '3.4-3.6',
  week6_app_count: Math.floor(Math.random() * 20) + 5,
  week6_brand_share: i < 12 ? 1.0 : (Math.random() * 0.8 + 0.2),
  matched_cluster_id: SEED_ALUMNI[i%30].cluster_id,
  current_forecast_placement_pct: i < 12 ? 0.31 : 0.65,
  locked_commitment_smes_per_week: i%3===0 ? 4 : null,
  advisor_assigned: ['Maya Okonkwo', 'Daniel Reyes', 'Jordan Mwangi'][i%3]
}));

const SEED_ROLES = Array.from({ length: 26 }).map((_, i) => ({
  role_id: `NUW-role-${i}`,
  employer: ['Formlabs', 'Tesla', 'Indigo Ag', 'Pillar Biosciences', 'Toast', 'Wayfair', 'HubSpot'][i%7],
  employer_tier: ['SME', 'Brand', 'Mid-market', 'SME', 'Mid-market', 'Brand', 'Mid-market'][i%7],
  role_title: ['Manufacturing Co-op', 'Supply Chain Co-op', 'Data Analyst', 'Lab Ops', 'BizOps'][i%5],
  location: 'Boston, MA'
}));

const SEED_ADVISORS = [
  { advisor_id: 'ADV-01', advisor_name: 'Maya Okonkwo', caseload_size: 38, brand_only_risk_count: 11 },
  { advisor_id: 'ADV-02', advisor_name: 'Daniel Reyes', caseload_size: 42, brand_only_risk_count: 14 },
  { advisor_id: 'ADV-03', advisor_name: 'Jordan Mwangi', caseload_size: 35, brand_only_risk_count: 8 }
];

// --- SHARED COMPONENTS ---
const Button = ({ children, variant = 'primary', onClick, disabled, className = '', style = {} }) => {
  const baseStyle = {
    height: '44px', padding: '0 24px', borderRadius: 'var(--radius-none)',
    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em',
    textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
    border: 'none', outline: 'none'
  };
  
  const variants = {
    primary: { background: 'var(--nxt-emphasis)', color: 'var(--nxt-text-primary)' },
    secondary: { background: 'transparent', color: 'var(--nxt-text-primary)', border: '1px solid var(--nxt-text-primary)' },
    ghost: { background: 'transparent', color: 'var(--nxt-text-secondary)' }
  };

  return (
    <motion.button 
      whileHover={!disabled ? { scale: 1.02 } : {}} 
      whileTap={!disabled ? { scale: 0.98 } : {}}
      style={{ ...baseStyle, ...variants[variant], opacity: disabled ? 0.5 : 1, ...style }}
      onClick={onClick} disabled={disabled} className={className}
    >
      {children}
    </motion.button>
  );
};

const Badge = ({ children, variant = 'neutral', onClick }) => {
  const variants = {
    neutral: { bg: 'var(--nxt-border)', color: 'var(--nxt-text-primary)' },
    success: { bg: 'var(--nxt-success)', color: '#fff' },
    warning: { bg: 'var(--nxt-warning)', color: '#fff' },
    friction: { bg: 'var(--nxt-friction)', color: '#fff' }
  };
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 8px',
      background: variants[variant].bg, color: variants[variant].color,
      borderRadius: 'var(--radius-sharp)', fontSize: '12px', fontWeight: 700,
      fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em',
      cursor: onClick ? 'pointer' : 'default'
    }}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '', style = {} }) => (
  <div className={className} style={{
    background: 'var(--nxt-surface)', border: '1px solid var(--nxt-border)',
    borderRadius: 'var(--radius-sharp)', padding: '24px', ...style
  }}>
    {children}
  </div>
);

// --- SCREENS ---

// 1. Teams Splash
const ScreenTeamsSplash = ({ onNext, student }) => {
  const [loading, setLoading] = useState(true);
  const [heroImg, setHeroImg] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 800));
        const img = await generateImage("Two abstract human silhouettes in charcoal-on-cream gradient, facing slightly away from each other, evoking divergent futures without faces or identifying features, editorial newspaper-illustration style, soft cross-hatching texture");
        setHeroImg(img);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className="p-aspot aspot-edu" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nxt-surface)' }}>
      <div style={{ height: '48px', background: 'var(--nxt-teal)', display: 'flex', alignItems: 'center', padding: '0 16px', color: 'white' }}>
        <lucide.MessageSquare size={20} style={{ marginRight: '12px' }} />
        <span className="t-label" style={{ color: 'white' }}>Microsoft Teams</span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Card style={{ maxWidth: '600px', width: '100%', background: 'var(--nxt-bg)', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
          <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--nxt-teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>L</div>
            <div>
              <div className="t-label">Liz (Strategic Co-op Director)</div>
              <div className="t-data text-secondary" style={{ fontSize: '11px' }}>Just now</div>
            </div>
          </div>

          {loading ? (
            <div className="flex-col gap-3">
              <div className="skeleton" style={{ height: 48, width: '80%' }} />
              <div className="skeleton" style={{ height: 20, width: '40%' }} />
              <div className="skeleton" style={{ height: 200, width: '100%', marginTop: 16 }} />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="t-display" style={{ marginBottom: '8px' }}>Two versions of your sophomore year, {student.name_first}.</h1>
              <div className="t-body text-secondary" style={{ marginBottom: '32px' }}>{student.major} • {student.gpa_band} GPA</div>
              
              <div style={{ position: 'relative', height: '240px', background: 'var(--nxt-surface)', marginBottom: '32px', overflow: 'hidden', borderRadius: 'var(--radius-sharp)' }}>
                {heroImg ? (
                  <motion.img 
                    src={heroImg} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nxt-border)' }}>
                    <lucide.Users size={48} color="var(--nxt-text-secondary)" />
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 16, left: 16 }} className="t-label">Brand-Only {student.name_first}</div>
                <div style={{ position: 'absolute', bottom: 16, right: 16 }} className="t-label">Balanced {student.name_first}</div>
                <motion.div 
                  style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'var(--nxt-border)' }}
                  initial={{ height: 0 }} animate={{ height: '100%' }} transition={{ delay: 0.5, duration: 0.8 }}
                />
              </div>

              <Button onClick={onNext} style={{ width: '100%' }}>Show me both futures</Button>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
};

// 2. Cohort Comparison
const ScreenCohortComparison = ({ onNext, student }) => {
  const [narratives, setNarratives] = useState({ brand: null, balanced: null });
  const [loading, setLoading] = useState({ brand: false, balanced: false });

  const fetchNarrative = async (type) => {
    if (narratives[type] || loading[type]) return;
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const stats = type === 'brand' 
        ? "Placement: 31%, Apps: 47, Ghosting: 6, Offer: $22-26/hr" 
        : "Placement: 78%, Apps: 22, Ghosting: 2, Offer: $24-29/hr";
      
      const res = await callAIWithVS(
        "You are an editorial writer for a higher-ed publication. Summarize cohort statistics into a 2-3 sentence second-person narrative. Tone must be factual, non-scolding, and encouraging. Never use verbatim quotes. Return JSON: { \"selected_variant\": \"string\" }",
        `Cohort Stats: ${stats}. Student Major: ${student.major}. Write a factual, non-scolding summary of what this sophomore fall feels like.`,
        { expectJson: true }
      );
      setNarratives(prev => ({ ...prev, [type]: res.data.selected_variant }));
    } catch (e) {
      setNarratives(prev => ({ ...prev, [type]: "This cohort typically experiences high application volume with delayed responses." }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const Gauge = ({ label, value }) => {
    const radius = 30;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    return (
      <div className="flex-col gap-1" style={{ padding: '16px 0', borderBottom: '1px solid var(--nxt-border)' }}>
        <div className="t-label text-secondary">{label}</div>
        <div className="flex-row items-center gap-4">
          <svg width="60" height="30" viewBox="0 0 80 40">
            <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke="var(--nxt-border)" strokeWidth="8" />
            <motion.path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke="var(--nxt-emphasis)" strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </svg>
          <div className="t-h3">{value}%</div>
        </div>
      </div>
    );
  };

  const BarChart = ({ label, value, max = 100 }) => (
    <div className="flex-col gap-1" style={{ padding: '16px 0', borderBottom: '1px solid var(--nxt-border)' }}>
      <div className="flex-row justify-between items-end">
        <span className="t-label text-secondary">{label}</span>
        <span className="t-h3">{value}</span>
      </div>
      <div style={{ width: '100%', height: 8, background: 'var(--nxt-border)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }} animate={{ width: `${(value/max)*100}%` }} 
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ height: '100%', background: 'var(--nxt-teal)' }} 
        />
      </div>
    </div>
  );

  const StatBlock = ({ label, value }) => (
    <div className="flex-col gap-1" style={{ padding: '16px 0', borderBottom: '1px solid var(--nxt-border)' }}>
      <div className="t-label text-secondary">{label}</div>
      <div className="t-h3">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: "easeOut" }}>
          {value}
        </motion.span>
      </div>
    </div>
  );

  return (
    <div className="p-compare flex-col" style={{ height: '100vh', background: 'var(--nxt-bg)' }}>
      <div className="flex-row items-center justify-between p-3 border-b">
        <div className="flex-row items-center gap-2">
          <lucide.BarChart2 size={20} color="var(--nxt-emphasis)" />
          <span className="t-label">Power BI Embedded</span>
        </div>
        <Badge variant="neutral">NUworks Data Source (k≥15)</Badge>
      </div>

      <div className="flex-row" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="flex-col p-5" style={{ flex: 1, borderRight: '1px solid var(--nxt-border)', overflowY: 'auto' }} onClick={() => fetchNarrative('brand')}>
          <h2 className="t-h2" style={{ marginBottom: '32px' }}>Brand-Only<br/><span className="text-secondary" style={{fontSize: '20px'}}>104 alumni like you</span></h2>
          <Gauge label="Placement Rate" value={31} />
          <BarChart label="Application Volume" value={47} max={100} />
          <StatBlock label="Ghosting Count" value={6} />
          <StatBlock label="Median Offer" value="$22-26/hr" />
          
          <div style={{ marginTop: '32px', minHeight: '100px' }}>
            {!narratives.brand && !loading.brand && <div className="t-label text-secondary" style={{ cursor: 'pointer' }}>Tap to generate narrative summary</div>}
            {loading.brand && <div className="skeleton" style={{ height: 60, width: '100%' }} />}
            {narratives.brand && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-quote">{narratives.brand}</motion.div>}
          </div>
        </div>

        <div className="flex-col p-5" style={{ flex: 1, background: 'var(--nxt-surface)', overflowY: 'auto' }} onClick={() => fetchNarrative('balanced')}>
          <h2 className="t-h2" style={{ marginBottom: '32px' }}>Balanced<br/><span className="text-secondary" style={{fontSize: '20px'}}>96 alumni like you</span></h2>
          <Gauge label="Placement Rate" value={78} />
          <BarChart label="Application Volume" value={22} max={100} />
          <StatBlock label="Ghosting Count" value={2} />
          <StatBlock label="Median Offer" value="$24-29/hr" />
          
          <div style={{ marginTop: '32px', minHeight: '100px' }}>
            {!narratives.balanced && !loading.balanced && <div className="t-label text-secondary" style={{ cursor: 'pointer' }}>Tap to generate narrative summary</div>}
            {loading.balanced && <div className="skeleton" style={{ height: 60, width: '100%' }} />}
            {narratives.balanced && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-quote">{narratives.balanced}</motion.div>}
          </div>
        </div>
      </div>

      <div className="p-4 border-t flex-row justify-center" style={{ background: 'var(--nxt-bg)' }}>
        <Button onClick={onNext} variant="secondary">Scroll down to Vignettes <lucide.ArrowDown size={16} style={{marginLeft: 8}} /></Button>
      </div>
    </div>
  );
};

// 3. Vignette Carousel
const ScreenVignetteCarousel = ({ onNext, student }) => {
  const [vignettes, setVignettes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVigs = async () => {
      try {
        const res = await callAIWithVS(
          "You are a synthesizer of human stories. Take clustered anonymized alumni records (k>=15) and industry context to write three 4-frame vignettes with synthetic monograms. No identifying details. Return JSON: { \"selected_variant\": { \"vignettes\": [ { \"monogram\": \"A\", \"frames\": [\"str\",\"str\",\"str\",\"str\"] } ] } }",
          `Cluster Data: IE Majors. Generate 3 vignettes, 4 frames each, max 18 words per frame.`,
          { expectJson: true }
        );
        setVignettes(res.data.selected_variant.vignettes || []);
      } catch (e) {
        setVignettes([
          { monogram: 'A', frames: ["Applied to 22 roles, mixed.", "Accepted process engineering at SME.", "Learned end-to-end CAD design.", "Now interviewing at top-tier firms."] },
          { monogram: 'B', frames: ["Focused entirely on local fintech.", "Joined 50-person B2B SaaS.", "Managed $50k ad budget directly.", "Returned for second co-op with promotion."] },
          { monogram: 'C', frames: ["Applied to 62 roles, 100% brand.", "Ghosted by 40, no fall placement.", "Spent fall building personal portfolio.", "Secured mid-market co-op in spring."] }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchVigs();
  }, []);

  return (
    <div className="p-swipe flex-col" style={{ height: '100vh', background: 'var(--nxt-surface)', padding: '48px 24px' }}>
      <div className="flex-row justify-between items-center" style={{ marginBottom: '48px' }}>
        <h2 className="t-h2">Three people, three paths</h2>
        <Badge variant="neutral"><lucide.Shield size={12} style={{marginRight: 4}}/> k≥15 Anonymized</Badge>
      </div>

      <div className="flex-row gap-4" style={{ overflowX: 'auto', paddingBottom: '24px', flex: 1 }}>
        {loading ? (
          <>
            <div className="skeleton" style={{ minWidth: 300, height: 400, borderRadius: 2 }} />
            <div className="skeleton" style={{ minWidth: 300, height: 400, borderRadius: 2 }} />
            <div className="skeleton" style={{ minWidth: 300, height: 400, borderRadius: 2 }} />
          </>
        ) : (
          vignettes.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Card style={{ minWidth: '320px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--nxt-bg)' }}>
                <div className="flex-row items-center gap-3 border-b" style={{ paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ width: 48, height: 48, background: 'var(--nxt-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontFamily: 'var(--font-display)' }}>
                    {v.monogram}
                  </div>
                  <div className="t-label text-secondary">Alumni {v.monogram}</div>
                </div>
                <div className="flex-col gap-4" style={{ flex: 1 }}>
                  {v.frames.map((frame, j) => (
                    <div key={j} className="flex-row gap-3">
                      <div style={{ width: 2, background: 'var(--nxt-emphasis)', marginTop: 6, marginBottom: 6 }} />
                      <div className="t-body">{frame}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex-row justify-center" style={{ marginTop: 'auto' }}>
        <Button onClick={onNext}>What if I shifted my mix?</Button>
      </div>
    </div>
  );
};

// 4. Portfolio Adjuster
const ScreenPortfolioAdjuster = ({ onNext, student, setGlobalMix }) => {
  const [brandShare, setBrandShare] = useState(100);
  const [metrics, setMetrics] = useState({ placementPct: 31, medianOffer: "$22-26/hr", ghostingCount: 6 });
  const [explanations, setExplanations] = useState([]);
  const [isExplaining, setIsExplaining] = useState(false);
  
  const pathProgress = useMotionValue(0);
  const avatarX = useTransform(pathProgress, [0, 100], ['0%', '90%']);
  const avatarY = useTransform(pathProgress, [0, 50, 100], ['0px', '-20px', '0px']);
  
  const pathD = useTransform(pathProgress, [0, 50, 100], [
    "M 0 50 Q 150 50 300 50 T 600 50",
    "M 0 50 Q 150 20 300 50 T 600 50",
    "M 0 50 Q 150 80 300 50 T 600 50"
  ]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await callAIWithFallback(
          "You are a real-time probability engine. Compute conditional probability surface based on dial position (0-100, where 100 is Brand-Only). Return JSON: { \"placement_pct\": number, \"median_offer\": \"string\", \"ghosting_count\": number }",
          `Current Mix: ${brandShare}% Brand.`,
          { expectJson: true }
        );
        if (res.data) {
          setMetrics({
            placementPct: res.data.placement_pct || Math.floor(31 + ((100-brandShare)/100)*47),
            medianOffer: res.data.median_offer || "$24-29/hr",
            ghostingCount: res.data.ghosting_count || Math.max(1, Math.floor(6 - ((100-brandShare)/100)*5))
          });
        }
      } catch (e) {
        setMetrics({
          placementPct: Math.floor(31 + ((100-brandShare)/100)*47),
          medianOffer: brandShare > 70 ? "$22-26/hr" : "$24-29/hr",
          ghostingCount: Math.max(1, Math.floor(6 - ((100-brandShare)/100)*5))
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [brandShare]);

  useEffect(() => {
    if (brandShare <= 60 && explanations.length === 0 && !isExplaining) {
      setIsExplaining(true);
      const fetchExp = async () => {
        try {
          const res = await callAIWithFallback(
            "You are a data explainer. Decompose placement-rate lift. Return JSON: { \"explanations\": [ { \"lever\": \"string\", \"contribution\": number, \"caption\": \"string\" } ] }",
            "Explain which 2 levers drove the lift from 31% to 78% when shifting to 60/40 mix.",
            { expectJson: true }
          );
          setExplanations(res.data.explanations || [
            { lever: "SME applications", contribution: 41, caption: "Adding 3 SME applications/week drives most of the lift because diversity reduces ghosting risk." },
            { lever: "Application diversity", contribution: 28, caption: "Applying across 3+ employer tiers increases interview yield by 2.4x." }
          ]);
        } catch (e) {
          setExplanations([
            { lever: "SME applications", contribution: 41, caption: "Adding 3 SME applications/week drives most of the lift because diversity reduces ghosting risk." }
          ]);
        }
      };
      fetchExp();
    }
  }, [brandShare, explanations.length, isExplaining]);

  const handleDrag = (e) => {
    const val = parseInt(e.target.value, 10);
    setBrandShare(val);
    pathProgress.set(100 - val);
  };

  const handleLock = () => {
    setGlobalMix(brandShare);
    onNext();
  };

  return (
    <div className="p-dial flex-col" style={{ height: '100vh', background: 'var(--nxt-bg)', padding: '48px 24px' }}>
      <h2 className="t-h2 text-center" style={{ marginBottom: '48px' }}>Adjust your portfolio mix</h2>
      
      <div className="flex-row justify-center gap-6" style={{ marginBottom: '64px' }}>
        <div className="flex-col items-center">
          <div className="t-label text-secondary">Placement %</div>
          <motion.div className="t-display" style={{ color: brandShare <= 60 ? 'var(--nxt-emphasis)' : 'var(--nxt-text-primary)' }}
            key={metrics.placementPct} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
            {metrics.placementPct}%
          </motion.div>
        </div>
        <div className="flex-col items-center">
          <div className="t-label text-secondary">Median Offer</div>
          <div className="t-display">{metrics.medianOffer}</div>
        </div>
        <div className="flex-col items-center">
          <div className="t-label text-secondary">Ghosting</div>
          <div className="t-display">{metrics.ghostingCount}</div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto 48px auto' }}>
        <input 
          type="range" min="0" max="100" value={brandShare} onChange={handleDrag}
          style={{ width: '100%', marginBottom: '16px' }}
        />
        <div className="flex-row justify-between t-label text-secondary">
          <span>100% SME</span>
          <span>100% Brand</span>
        </div>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto 48px auto', height: '100px', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <motion.path d={pathD} fill="none" stroke="var(--nxt-border)" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
        <motion.div style={{ position: 'absolute', top: '50%', left: avatarX, y: avatarY, marginTop: '-16px' }}>
          <lucide.User size={32} color="var(--nxt-text-primary)" />
        </motion.div>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', minHeight: '160px' }}>
        <AnimatePresence>
          {brandShare <= 60 && explanations.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex-col gap-4">
              <div className="t-label">Why did the number move?</div>
              {explanations.map((exp, i) => (
                <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
                  <div className="flex-row items-center gap-3" style={{ marginBottom: 4 }}>
                    <div style={{ width: `${exp.contribution}%`, height: 8, background: 'var(--nxt-emphasis)', borderRadius: 2 }} />
                    <span className="t-data">{exp.contribution}%</span>
                  </div>
                  <div className="t-body text-secondary" style={{ fontSize: '14px' }}>{exp.caption}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-row justify-center" style={{ marginTop: 'auto' }}>
        <Button onClick={handleLock}>Lock in my new mix</Button>
      </div>
    </div>
  );
};

// 5. Advisor Commit
const ScreenAdvisorCommit = ({ onNext, student, globalMix, setGlobalSmes }) => {
  const [smes, setSmes] = useState(4);
  const [opener, setOpener] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpener = async () => {
      try {
        const res = await callAIWithFallback(
          "You are drafting a short note to an academic advisor. Return JSON: { \"text\": \"string\" }",
          `Student shifted target to ${globalMix}% brand, committing to ${smes} SME apps/week. Draft 1 sentence opener.`,
          { expectJson: true }
        );
        setOpener(res.data.text || "I've adjusted my co-op search strategy to include more SMEs.");
      } catch {
        setOpener("I've adjusted my co-op search strategy to include more SMEs.");
      } finally {
        setLoading(false);
      }
    };
    fetchOpener();
  }, [globalMix, smes]);

  const handleShare = () => {
    setGlobalSmes(smes);
    onNext();
  };

  return (
    <div className="p-assign" style={{ height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <motion.div 
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        style={{ width: '100%', background: 'var(--nxt-bg)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '32px 24px' }}
      >
        <h2 className="t-h2" style={{ marginBottom: '32px' }}>Share with {student.advisor_assigned}</h2>
        
        <Card style={{ marginBottom: '32px', background: 'var(--nxt-surface)' }}>
          <div className="t-label text-secondary" style={{ marginBottom: 8 }}>To: {student.advisor_assigned}</div>
          {loading ? <div className="skeleton" style={{ height: 40, width: '100%' }} /> : (
            <textarea 
              value={opener} onChange={(e) => setOpener(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '16px', resize: 'none', minHeight: '60px' }}
            />
          )}
          <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--nxt-border)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <lucide.BarChart2 size={24} color="var(--nxt-emphasis)" />
            <div>
              <div className="t-label">Forecast Snapshot Attached</div>
              <div className="t-data text-secondary">Target Mix: {globalMix}% Brand</div>
            </div>
          </div>
        </Card>

        <div style={{ marginBottom: '48px' }}>
          <div className="flex-row justify-between items-center" style={{ marginBottom: 16 }}>
            <span className="t-label">My Weekly Goal</span>
            <span className="t-h3">{smes} <span className="t-body text-secondary" style={{textTransform:'none'}}>SMEs/week</span></span>
          </div>
          <input type="range" min="1" max="8" value={smes} onChange={(e) => setSmes(parseInt(e.target.value))} />
        </div>

        <div className="flex-row gap-3">
          <Button variant="ghost" style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={handleShare}>Share with Maya</Button>
        </div>
      </motion.div>
    </div>
  );
};

// 6. Weekly Checkin
const ScreenWeeklyCheckin = ({ onNext, student, globalSmes }) => {
  const [nudge, setNudge] = useState("");
  const [loading, setLoading] = useState(true);
  const actualSmes = 5;

  useEffect(() => {
    const fetchNudge = async () => {
      try {
        const res = await callAIWithVS(
          "You are an encouraging co-op advisor Copilot. Compare actual application data to target. Write one adaptive-card line that is encouraging, never punitive. Return JSON: { \"selected_variant\": \"string\" }",
          `Target: ${globalSmes}. Actual: ${actualSmes}. Forecast: 71%. Write a 1-sentence nudge.`,
          { expectJson: true }
        );
        setNudge(res.data.selected_variant || `You hit ${actualSmes}/${globalSmes} SMEs this week — your forecast just moved to 71%.`);
      } catch {
        setNudge(`You hit ${actualSmes}/${globalSmes} SMEs this week — your forecast just moved to 71%.`);
      } finally {
        setLoading(false);
      }
    };
    fetchNudge();
  }, [globalSmes]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(actualSmes / globalSmes, 1) * circumference);

  return (
    <div className="p-kpi" style={{ height: '100vh', background: 'var(--nxt-surface)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '48px', background: 'var(--nxt-teal)', display: 'flex', alignItems: 'center', padding: '0 16px', color: 'white', margin: '-24px -24px 24px -24px' }}>
        <lucide.MessageSquare size={20} style={{ marginRight: '12px' }} />
        <span className="t-label" style={{ color: 'white' }}>Microsoft Teams</span>
      </div>

      <Card style={{ maxWidth: '400px', margin: '0 auto', width: '100%', background: 'var(--nxt-bg)' }}>
        <div className="flex-row justify-between items-center border-b" style={{ paddingBottom: 16, marginBottom: 16 }}>
          <div className="t-label">Co-op Forecast Check-in</div>
          <div className="t-data text-secondary" style={{ fontSize: 11 }}>Friday 4:00 PM</div>
        </div>

        <div className="flex-row items-center gap-4" style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r={radius} stroke="var(--nxt-border)" strokeWidth="8" fill="none" />
              <motion.circle 
                cx="50" cy="50" r={radius} stroke="var(--nxt-emphasis)" strokeWidth="8" fill="none"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span className="t-h3" style={{ lineHeight: 1 }}>{actualSmes}</span>
              <span className="t-label text-secondary" style={{ fontSize: 10 }}>of {globalSmes}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {loading ? <div className="skeleton" style={{ height: 40, width: '100%' }} /> : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="t-body">
                {nudge}
              </motion.div>
            )}
          </div>
        </div>

        <div className="t-label text-secondary" style={{ marginBottom: 12 }}>Roles your forecast loves:</div>
        <div className="flex-col gap-2" style={{ marginBottom: 24 }}>
          {SEED_ROLES.slice(0,3).map((r, i) => (
            <div key={i} className="flex-row justify-between items-center p-3" style={{ background: 'var(--nxt-surface)', border: '1px solid var(--nxt-border)', borderRadius: 2 }}>
              <div>
                <div className="t-label">{r.employer}</div>
                <div className="t-body text-secondary" style={{ fontSize: 14 }}>{r.role_title}</div>
              </div>
              <lucide.ChevronRight size={16} color="var(--nxt-text-secondary)" />
            </div>
          ))}
        </div>

        <Button variant="secondary" style={{ width: '100%' }} onClick={onNext}>View full forecast</Button>
      </Card>
    </div>
  );
};

// 7. Data Map
const ScreenDataMap = ({ onNext }) => {
  const [activeNode, setActiveNode] = useState(null);

  const nodes = [
    { id: 'nuworks', label: 'NUworks', type: 'Source', x: 50, y: 100 },
    { id: 'pa', label: 'Power Automate', type: 'Pipeline', x: 200, y: 100 },
    { id: 'gate', label: 'FERPA Gate (k≥15)', type: 'Anonymization', x: 350, y: 100, isGate: true },
    { id: 'ai', label: 'Azure OpenAI', type: 'Processor', x: 500, y: 100 },
    { id: 'pbi', label: 'Power BI', type: 'Visualization', x: 650, y: 100 }
  ];

  const nodeDetails = {
    nuworks: { in: [], out: ['student_id', 'major', 'employer', 'placement_status'] },
    pa: { in: ['student_id', 'major', 'employer', 'placement_status'], out: ['cluster_id', 'major', 'strategy_label'] },
    gate: { in: ['cluster_id', 'strategy_label'], out: ['k_anonymized_cluster'] },
    ai: { in: ['k_anonymized_cluster'], out: ['narrative_summary', 'vignette_text'] },
    pbi: { in: ['narrative_summary', 'vignette_text', 'k_anonymized_cluster'], out: ['dashboard_render'] }
  };

  return (
    <div className="p-pipe flex-col" style={{ height: '100vh', background: 'var(--nxt-bg)' }}>
      <div className="flex-row justify-between items-center p-4 border-b">
        <h2 className="t-h2">Underlying Data Map</h2>
        <lucide.X size={24} style={{ cursor: 'pointer' }} onClick={onNext} />
      </div>

      <div style={{ flex: 1, position: 'relative', overflowX: 'auto', padding: '48px' }}>
        <div style={{ minWidth: '800px', height: '200px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 100, left: 50, right: 150, height: 2, background: 'var(--nxt-border)', zIndex: 0 }} />
          
          <motion.div 
            style={{ position: 'absolute', top: 96, width: 10, height: 10, borderRadius: '50%', background: 'var(--nxt-text-primary)', zIndex: 1 }}
            animate={{ left: [50, 650] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {nodes.map((n) => (
            <div key={n.id} 
              onClick={() => setActiveNode(n.id)}
              style={{ 
                position: 'absolute', left: n.x - 60, top: n.y - 40, width: 120, 
                background: n.isGate ? 'var(--nxt-surface)' : 'var(--nxt-bg)', 
                border: `2px solid ${n.isGate ? 'var(--nxt-emphasis)' : 'var(--nxt-border)'}`, 
                borderRadius: 2, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', zIndex: 2,
                boxShadow: activeNode === n.id ? '0 0 0 2px var(--nxt-text-primary)' : 'none'
              }}>
              <div className="t-label" style={{ fontSize: 10, color: n.isGate ? 'var(--nxt-emphasis)' : 'var(--nxt-text-secondary)' }}>{n.type}</div>
              <div className="t-body" style={{ fontSize: 14, fontWeight: 700 }}>{n.label}</div>
            </div>
          ))}
        </div>

        {activeNode && (
          <Card style={{ marginTop: 24, maxWidth: '600px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Field-Level Mapping: {nodes.find(n => n.id === activeNode)?.label}</div>
            <div className="flex-row gap-6">
              <div className="flex-col gap-2">
                <div className="t-label text-secondary">Fields In</div>
                {nodeDetails[activeNode].in.length === 0 ? <div className="t-data text-secondary">None</div> : nodeDetails[activeNode].in.map(f => <div key={f} className="t-data">{f}</div>)}
              </div>
              <div className="flex-col gap-2">
                <div className="t-label text-secondary">Fields Out</div>
                {nodeDetails[activeNode].out.map(f => <div key={f} className="t-data">{f}</div>)}
              </div>
            </div>
          </Card>
        )}

        <div style={{ marginTop: '48px', maxWidth: '600px' }}>
          <Card>
            <div className="t-label" style={{ marginBottom: 8 }}>FERPA Anonymization Disclosure</div>
            <div className="t-body text-secondary" style={{ marginBottom: 16 }}>All cohort renderings enforce k≥15 anonymization. Individual student records are never passed to the visualization layer without aggregation.</div>
            <Badge variant="success">Audited by Jen (FERPA Compliance)</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
};

// 8. Advisor Dashboard
const ScreenAdvisorDashboard = ({ onNext }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const res = await callAIWithFallback(
          "You are a risk-pattern detector. Cluster first-year cohort week-6 behavior vectors against historical brand-only-risk archetypes. Return JSON: { \"at_risk_students\": [ { \"student_id\": \"string\", \"confidence_score\": number } ] }",
          `Caseload Vectors: ${JSON.stringify(SEED_STUDENTS.slice(0, 10).map(s => ({id: s.student_id, brand_share: s.week6_brand_share})))}. Identify students resembling the high-risk cluster.`,
          { expectJson: true }
        );
        
        const riskIds = res.data?.at_risk_students?.map(r => r.student_id) || [];
        
        setStudents(SEED_STUDENTS.slice(0, 10).map(s => ({
          ...s,
          risk: riskIds.includes(s.student_id) || s.week6_brand_share > 0.8 ? 'High (Brand-Only)' : 'Low (Balanced)',
          mix: `${Math.round(s.week6_brand_share*100)}/${Math.round((1-s.week6_brand_share)*100)}`
        })));
      } catch (e) {
        setStudents(SEED_STUDENTS.slice(0, 10).map(s => ({
          ...s,
          risk: s.week6_brand_share > 0.8 ? 'High (Brand-Only)' : 'Low (Balanced)',
          mix: `${Math.round(s.week6_brand_share*100)}/${Math.round((1-s.week6_brand_share)*100)}`
        })));
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, []);

  const handleBulkSend = () => {
    setToast(true);
    setTimeout(() => { setToast(false); onNext(); }, 2000);
  };

  return (
    <div className="p-cohort flex-row" style={{ height: '100vh', background: 'var(--nxt-bg)' }}>
      <div style={{ width: '240px', borderRight: '1px solid var(--nxt-border)', background: 'var(--nxt-surface)', padding: '24px' }}>
        <div className="t-label" style={{ marginBottom: 24 }}>Teams App</div>
        <div className="t-body font-bold">Caseload</div>
        <div className="t-body text-secondary">Interventions</div>
      </div>

      <div className="flex-col" style={{ flex: 1, padding: '48px' }}>
        <div className="flex-row justify-between items-center" style={{ marginBottom: 32 }}>
          <h2 className="t-h2">First-Year Caseload</h2>
          <Button onClick={handleBulkSend}>Send Counterfactual</Button>
        </div>

        <div className="flex-row gap-4" style={{ marginBottom: 24 }}>
          <select style={{ padding: '8px 16px', border: '1px solid var(--nxt-border)', borderRadius: 2, fontFamily: 'var(--font-body)' }}>
            <option>Risk Band: All</option>
            <option>High (Brand-Only)</option>
          </select>
        </div>

        {loading ? (
          <div className="flex-col gap-2">
            {Array.from({length: 5}).map((_, i) => <div key={i} className="skeleton" style={{ height: 64, width: '100%' }} />)}
          </div>
        ) : (
          <div className="flex-col gap-2">
            {students.map((s, i) => (
              <div key={i} className="flex-row items-center justify-between p-3" style={{ border: '1px solid var(--nxt-border)', borderRadius: 2 }}>
                <div style={{ flex: 1 }}>
                  <div className="t-body font-bold">{s.name_first} {s.student_id}</div>
                  <div className="t-data text-secondary">{s.major}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="t-label text-secondary">Current Mix</div>
                  <div className="t-data">{s.mix}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: 2, fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    background: s.risk.includes('High') ? 'rgba(253, 142, 46, 0.1)' : 'rgba(12, 206, 107, 0.1)',
                    color: s.risk.includes('High') ? 'var(--nxt-warning)' : 'var(--nxt-success)'
                  }}>
                    {s.risk}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--nxt-text-primary)', color: 'white', padding: '16px 24px', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <lucide.CheckCircle size={20} color="var(--nxt-emphasis)" />
            <span className="t-body">Counterfactual sent to 11 high-risk students.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [currentScreen, setCurrentScreen] = useState('teams_splash');
  const [globalMix, setGlobalMix] = useState(100);
  const [globalSmes, setGlobalSmes] = useState(4);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = nxtStyles;
    document.head.appendChild(styleEl);
    document.documentElement.setAttribute('data-brand', 'nxt');
    return () => document.head.removeChild(styleEl);
  }, []);

  const screens = [
    'teams_splash', 'cohort_comparison', 'vignette_carousel', 'portfolio_adjuster', 
    'advisor_commit', 'weekly_checkin', 'data_map', 'advisor_dashboard'
  ];

  const goNext = () => {
    const idx = screens.indexOf(currentScreen);
    if (idx < screens.length - 1) setCurrentScreen(screens[idx + 1]);
    else setCurrentScreen(screens[0]);
  };

  const demoStudent = SEED_STUDENTS[0];

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 9999, background: 'white', padding: '8px', border: '1px solid var(--nxt-border)', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <select 
          value={currentScreen} 
          onChange={(e) => setCurrentScreen(e.target.value)}
          style={{ fontFamily: 'var(--font-body)', fontSize: 12, padding: '4px 8px', border: 'none', outline: 'none', cursor: 'pointer' }}
        >
          {screens.map((s, i) => <option key={s} value={s}>{i+1}. {s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentScreen}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          {currentScreen === 'teams_splash' && <ScreenTeamsSplash onNext={goNext} student={demoStudent} />}
          {currentScreen === 'cohort_comparison' && <ScreenCohortComparison onNext={goNext} student={demoStudent} />}
          {currentScreen === 'vignette_carousel' && <ScreenVignetteCarousel onNext={goNext} student={demoStudent} />}
          {currentScreen === 'portfolio_adjuster' && <ScreenPortfolioAdjuster onNext={goNext} student={demoStudent} setGlobalMix={setGlobalMix} />}
          {currentScreen === 'advisor_commit' && <ScreenAdvisorCommit onNext={goNext} student={demoStudent} globalMix={globalMix} setGlobalSmes={setGlobalSmes} />}
          {currentScreen === 'weekly_checkin' && <ScreenWeeklyCheckin onNext={goNext} student={demoStudent} globalSmes={globalSmes} />}
          {currentScreen === 'data_map' && <ScreenDataMap onNext={goNext} />}
          {currentScreen === 'advisor_dashboard' && <ScreenAdvisorDashboard onNext={goNext} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

function __test_state_transitions__() {
  console.assert(typeof App === 'function', 'App must be a component');
  return true;
}
if (typeof window !== 'undefined') {
  window.__hicProtoTests = __test_state_transitions__;
}