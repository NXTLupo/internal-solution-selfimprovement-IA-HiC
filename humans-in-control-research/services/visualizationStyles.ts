/**
 * Visualization Style System — 20 Elite Executive-Grade Visual Systems
 * Designed to eradicate generic corporate art. Each style has context-specific
 * prompt blueprints for: portraits, scenes, diagrams, charts, icons.
 */

export interface VisualizationStyle {
    id: string;
    name: string;
    shortLabel: string;
    description: string;
    verticals: string;
    promptBase: {
        portrait: string;
        scene: string;
        diagram: string;
        chart: string;
        icon: string;
    };
    negativeConstraints: string;
    motionStyle: string;
}

export const VISUALIZATION_STYLES: VisualizationStyle[] = [
    {
        id: 'cyanotype_blueprint',
        name: 'Architectural Cyanotype Blueprinting',
        shortLabel: 'Blueprint',
        description: 'Highly engineered, foundational, transparent. "We built this from the ground up."',
        verticals: 'Logistics, Infrastructure, Backend SaaS',
        promptBase: {
            portrait: 'Technical architectural blueprint portrait. Precise ergonomic human diagram (like Da Vinci Vitruvian Man but modern). Cyanotype aesthetic, white lines on deep Prussian blue. Measurement notations and grid overlays.',
            scene: 'Technical architectural blueprint illustration. Cyanotype aesthetic, striking white lines on deep Prussian blue background. Utilitarian, structural, highly engineered. Meticulous drafting lines, measurement notations, grid overlays. Objective, industrial, precise. Pure monoline vector schematic.',
            diagram: 'Architectural blueprint schematic diagram. Data points as structural load-bearing nodes. Cyanotype white-on-blue. Precise compass-drawn connections, measurement annotations.',
            chart: 'Blueprint-style data visualization. Structural engineering aesthetic. Data as load-bearing elements on architectural schematic. White lines on Prussian blue, grid paper background.',
            icon: 'Cyanotype blueprint icon. Single white monoline technical drawing on Prussian blue. Precision compass geometry.',
        },
        negativeConstraints: 'No gradients, no color beyond blue/white, no photorealism, no playful elements.',
        motionStyle: 'Drawing physically drafts itself with compass and straightedge animations.',
    },
    {
        id: 'cellular_organic',
        name: 'Macro-Cellular Organic Abstraction',
        shortLabel: 'Cellular',
        description: 'Life-saving, fundamental, dynamic. Building blocks of life, not cliche stethoscopes.',
        verticals: 'Healthcare, Biotech, Life Sciences',
        promptBase: {
            portrait: 'Macro-cellular biological abstract portrait. Translucent organic membranes forming a human silhouette. Sub-surface scattering, volumetric lighting, glowing internal structures. Soft aquamarine and pale coral palette.',
            scene: 'Macro-cellular biological abstract 3D visualization. Microscopic photography aesthetic. Soft translucent organic membranes interacting in fluid environment. Sub-surface scattering, volumetric lighting, glowing internal structures. Muted pastel healthcare palette: soft aquamarine, pale coral, white. Deep depth of field, elegant, life-affirming.',
            diagram: 'Biological cellular diagram. Soft-body organic nodes connected by translucent membrane pathways. Glowing internal structures showing data flow. Healthcare pastel palette.',
            chart: 'Heat map visualization mapped onto 3D breathing organic surfaces. Cellular membrane aesthetic. Glowing gradients showing intensity. Aquamarine to coral spectrum.',
            icon: 'Glowing organic cellular icon. Translucent membrane with internal light. Soft aquamarine, minimal, life-affirming.',
        },
        negativeConstraints: 'No harsh edges, no mechanical elements, no corporate sterility, no stethoscopes or pills.',
        motionStyle: 'Extremely slow undulating microscopic motion. Depth of field shifts revealing new glowing layers.',
    },
    {
        id: 'suprematist_vector',
        name: 'Suprematist Vector Dynamics',
        shortLabel: 'Suprematist',
        description: 'High-velocity, revolutionary, unanchored. Shatters the grid to imply explosive momentum.',
        verticals: 'Disruptive FinTech, Rapid-Growth Startups',
        promptBase: {
            portrait: 'Suprematist geometric portrait. Bold floating shapes forming abstract human presence. Crimson red, carbon black, pure white. Aggressive off-axis composition. Absolute flat vector purity.',
            scene: 'Russian Constructivist and Suprematist vector graphic design. High-energy floating geometric abstraction. Perfect circles, sharp triangles, heavy rectangles. Suspended in vast white negative space. Aggressive disruptive motion implied by off-axis angles. Stark: crimson red, carbon black, pure white. Absolute flat vector purity.',
            diagram: 'Suprematist diagram. Heavy geometric shapes in orbital balance representing system synergy. Crimson and black on white. Off-axis energy, no grid alignment.',
            chart: 'Bar charts tilting aggressively off-axis, breaking out of bounding boxes, shooting into negative space. Crimson red and black. Flat vector, no 3D.',
            icon: 'Suprematist icon. Single bold geometric shape (circle, triangle, or rectangle). Crimson on white. Aggressive angle.',
        },
        negativeConstraints: 'No 3D, no textures, no gradients, no photorealism, no soft colors.',
        motionStyle: 'Explosive rapid easing. Shapes slam into frame from off-screen, kinetic aggressive transitions.',
    },
    {
        id: 'topographical',
        name: 'Tactile Topographical Mapping',
        shortLabel: 'Topo Map',
        description: 'Navigational, expansive, strategic. Markets as terrain, journeys as mountain passes.',
        verticals: 'Global Logistics, Real Estate, Market Expansion',
        promptBase: {
            portrait: 'Pinpoint of brilliant light navigating complex topographical terrain. Glowing human form as waypoint on strategic map. Deep slate base with neon pathways.',
            scene: 'Tactile 3D topographical map illustration. High-end geospatial visualization. Precise contour lines overlaying clean matte 3D terrain mesh. Elegant, strategic, navigational. Monochromatic deep slate base with striking glowing neon pathways representing data flow. Dramatic raking light emphasizing elevation.',
            diagram: '3D raised-relief topographical diagram. Peaks and valleys represent performance metrics. Contour lines as process stages. Glowing path cutting through terrain.',
            chart: '3D raised-relief map chart. Market highs as mountain peaks, lows as valleys. Glowing neon data pathways. Contour lines with elevation labels.',
            icon: 'Topographical contour icon. Concentric elevation rings with single glowing center point. Slate and neon.',
        },
        negativeConstraints: 'No flat 2D, no cartoon, no corporate clip art, no bright playful colors.',
        motionStyle: 'Satellite camera glides over terrain. Contour lines morph to reflect real-time data changes.',
    },
    {
        id: 'op_art',
        name: 'Kinetic Op-Art Systems',
        shortLabel: 'Op-Art',
        description: 'Mesmerizing, infinite, algorithmic. For invisible but highly active products.',
        verticals: 'AI, Cybersecurity, Deep Tech',
        promptBase: {
            portrait: 'Op-Art geometric portrait. Black and white line work creating intense optical illusion of a human face. Warping grids implying 3D volume on 2D plane. Mesmerizing, algorithmic.',
            scene: 'Kinetic Op-Art geometric illustration inspired by Victor Vasarely. Black and white highly mathematical line work creating intense optical illusions. Warping grids, implied 3D volume through line density. Mesmerizing, algorithmic, vibrating. Absolute precision, flawless curves. Pure optical manipulation.',
            diagram: 'Op-Art system diagram. Data density creates physical warping in geometric line patterns. Network nodes as focal distortion points. Black and white only.',
            chart: 'Op-Art data visualization. Flat grid bulging into 3D sphere through pure line manipulation. Data density as visual distortion intensity. Black and white.',
            icon: 'Op-Art icon. Single warping geometric pattern creating illusion of depth. Black lines on white. Mathematical precision.',
        },
        negativeConstraints: 'Avoid all color. Rely purely on black, white, and optical manipulation. No fills, no gradients.',
        motionStyle: 'Relentless hypnotic looping. Lines phase in and out creating forward movement illusion.',
    },
    {
        id: 'luxury_skeuomorphic',
        name: 'Skeuomorphic Luxury Materials',
        shortLabel: 'Luxury',
        description: 'Elite, exclusive, highly secure. Titanium, carbon fiber, dark walnut.',
        verticals: 'Wealth Management, High-End FinTech, Executive Dashboards',
        promptBase: {
            portrait: 'Ultra-premium skeuomorphic 3D portrait. Heavy personalized embossed physical card or signet representing the person. Brushed titanium, dark walnut accents. Flawless physical lighting.',
            scene: 'Ultra-premium skeuomorphic 3D render. Macro focus on luxury physical materials: brushed titanium, matte carbon fiber, dark walnut wood, frosted glass. Flawless physical lighting, specular highlights. Highly secure elite financial aesthetic. Impeccable craftsmanship, heavy tactile weight. Somber, authoritative.',
            diagram: 'Luxury material diagram. Alternating physical wedges of dark walnut and brushed aluminum forming system architecture. Chamfered titanium edges. Premium render.',
            chart: 'Pie chart rendered as alternating physical wedges of dark walnut wood and brushed aluminum. Specular highlights. Ultra-premium material quality.',
            icon: 'Luxury material icon. Brushed titanium with chamfered edge. Single premium material render. Heavy, tactile, authoritative.',
        },
        negativeConstraints: 'No cheap plastics, no bright playful colors, no cartoon, no flat design.',
        motionStyle: 'High-end product commercial vibes. Glinting light rolling off chamfered metal edges.',
    },
    {
        id: 'liquid_chrome',
        name: 'Liquid Chrome & Fluid Glass',
        shortLabel: 'Chrome',
        description: 'Frictionless, futuristic, premium. Two drops of chrome merging seamlessly.',
        verticals: 'High-End SaaS, UI/UX Conceptualization, Web3',
        promptBase: {
            portrait: 'Futuristic liquid chrome abstract avatar. Sleek mirrored surface reflecting vibrant environment. Highly reflective metallic with translucent glass accents. Neon purple and cyan reflections.',
            scene: 'Futuristic 3D liquid chrome and fluid glass illustration. Abstract frictionless fluid dynamics. Highly reflective metallic surfaces interacting with translucent refractive glass shapes. Sleek premium tech aesthetic. Studio lighting with vivid neon purples and cyans reflecting off chrome. Flawless, smooth, weightless.',
            diagram: 'Liquid chrome diagram. Flowing metallic streams connecting glass nodes. Reflective surfaces bending environmental light. Frictionless data flow visualization.',
            chart: 'Liquid mercury forming dynamic flowing wave-graphs reflecting environment. Chrome data points, glass axes. Premium tech aesthetic.',
            icon: 'Liquid chrome droplet icon. Perfect sphere with environment reflections. Neon highlights on metallic surface.',
        },
        negativeConstraints: 'No matte surfaces, no flat design, no paper textures, no cartoon.',
        motionStyle: 'Utterly smooth 60fps fluid dynamics. Reflective surfaces bending light as they move.',
    },
    {
        id: 'duotone_editorial',
        name: 'High-Contrast Duotone Editorial',
        shortLabel: 'Duotone',
        description: 'Human, bold, raw, grounded. Real faces as brand assets, not stock photos.',
        verticals: 'B2C SaaS, HR Platforms, Consumer Brands',
        promptBase: {
            portrait: 'High-contrast duotone editorial photography portrait. Intense color grading using only two vivid contrasting brand colors (deep indigo and fluorescent green). Gritty real human expression. Spotify design aesthetic. Bold, modern.',
            scene: 'High-contrast duotone editorial photography mixed with flat graphic UI overlays. Intense color grading using two vivid contrasting colors. Gritty real human expression combined with pristine sharp vector graphics floating in foreground. Bold, modern, disruptive.',
            diagram: 'Bold flat graphic diagram superimposed over duotone photography. Crisp vector connections over gritty human imagery. Deep depth layers. Two-color brand palette.',
            chart: 'Bold flat graphic chart superimposed physically over duotone photograph. Creating deep depth. Two vivid contrasting colors. Spotify aesthetic.',
            icon: 'Duotone icon. Two-color bold graphic. Flat vector with halftone texture hint. Editorial punch.',
        },
        negativeConstraints: 'No more than 2 colors. No corporate sterility, no clip art, no illustration.',
        motionStyle: 'Glitch cuts, rapid photographic montages. Graphic overlays track with handheld footage.',
    },
    {
        id: 'patent_schematic',
        name: 'Technical Patent Schematics',
        shortLabel: 'Patent',
        description: 'Inventive, proprietary, historical but cutting-edge. Da Vinci meets innovation.',
        verticals: 'IP Pitches, Hardware, Engineering Innovation',
        promptBase: {
            portrait: 'Vintage technical patent drawing of a person. Finely stippled hands operating machinery. Black ink on aged parchment. Numbered reference arrows. 19th-century inventor aesthetic.',
            scene: 'Vintage technical patent drawing. Finely detailed black ink line art on slightly aged off-white parchment. Stippled shading, exploded-view schematics. Numbered reference arrows pointing to intricate components. Inventive, proprietary, highly academic. Pure 19th-century inventor aesthetic.',
            diagram: 'Patent schematic exploded-view diagram. Complex mechanical breakdown with numbered parts. Stippled shading. Aged parchment. Fine ink lines.',
            chart: 'Information displayed on drawn mechanical ticker-tape or analog gauges. Patent drawing style. Black ink on parchment. Numbered annotations.',
            icon: 'Patent schematic icon. Fine black ink technical drawing. Stippled shading. Aged parchment background. Single component detail.',
        },
        negativeConstraints: 'No modern digital gloss, no color, no 3D rendering, no photography.',
        motionStyle: 'Static aged paper background. Crisp ink lines draw themselves with scratchy fountain pen sound.',
    },
    {
        id: 'zen_lithography',
        name: 'Minimalist Zen Lithography',
        shortLabel: 'Zen',
        description: 'Sustainable, calm, enduring. Rock gardens and bamboo forests as corporate metaphors.',
        verticals: 'ESG Reports, Renewable Energy, Wellness Tech',
        promptBase: {
            portrait: 'Minimalist zen lithography portrait. Elegantly simplified fluid figure. Japanese woodblock print influence. Sage, slate, bamboo, bone palette. Sweeping organic lines. Visible paper tooth.',
            scene: 'Minimalist zen lithography illustration. Japanese woodblock print influence combined with modern corporate minimalism. Vast negative space. Subdued organic palette: sage, slate, bamboo, bone. Flawless sweeping organic lines. Calm, sustainable, perfectly balanced. Visible paper tooth and subtle analog print textures.',
            diagram: 'Zen garden diagram. Raked sand patterns as process flows. Stone arrangements as system nodes. Bamboo palette. Serene, balanced, minimal.',
            chart: 'Bar chart organically represented by varying-height pine trees reflecting in still water. Zen lithography style. Sage and bone palette.',
            icon: 'Enso brush stroke icon. Single continuous circular stroke enclosing subject. Zen simplicity. Sage on bone.',
        },
        negativeConstraints: 'No bright colors, no digital gloss, no aggressive geometry, no corporate blue.',
        motionStyle: 'Extremely slow, peaceful. Ink spreading gently through wet paper. Faint handmade textures.',
    },
    {
        id: 'glass_refraction',
        name: 'Optomechanical Glass Refraction',
        shortLabel: 'Glass',
        description: 'Laser-focused, analytical, revealing. Raw data through a prism becomes organized light.',
        verticals: 'Data Analytics, Search Platforms, Cybersecurity',
        promptBase: {
            portrait: 'Optomechanical glass portrait. Face seen through heavy polished glass lens creating beautiful refraction. Volumetric light beams. Dark atmospheric environment. Analytical, revealing.',
            scene: 'Optomechanical 3D glass refraction visualization. Heavy flawlessly polished glass lenses and prisms interacting with intense beams of pure light. Dark moody atmospheric environment with volumetric lighting. Dispersion into vivid spectrums. Analytical, laser-focused, high-tech. Hyper-realistic caustics and glass physics.',
            diagram: 'Glass refraction diagram. Data as focused focal points of intersecting laser beams in dark atmospheric room. Prisms separating chaotic input into organized output.',
            chart: 'Chaotic raw data passing through polished glass prism, exiting as perfectly organized color-coded beams of light. Dark environment, volumetric lighting.',
            icon: 'Glass prism icon. Single polished lens with light beam entering and spectrum exiting. Dark background, vivid dispersion.',
        },
        negativeConstraints: 'No flat design, no cartoon, no daylight scenes, no matte surfaces.',
        motionStyle: 'Light rays physically bending. Dust motes in laser light. Atmospheric focal length shifts.',
    },
    {
        id: 'brutalist_concrete',
        name: 'Monolithic Brutalist Concrete',
        shortLabel: 'Brutalist',
        description: 'Unshakeable, permanent, secure. Tadao Ando meets enterprise infrastructure.',
        verticals: 'Enterprise Cloud, Banking, Legacy Systems',
        promptBase: {
            portrait: 'Tiny sharply dressed figure to emphasize monumental scale of brutalist concrete architecture. Tadao Ando influence. Harsh realistic sunlight, pitch-black shadows.',
            scene: 'Monolithic brutalist concrete architectural 3D illustration. Tadao Ando influence. Massive unshakeable geometric structures of raw cast concrete. Visible formwork tie-holes and brutalist textures. Harsh realistic dramatic sunlight casting deep pitch-black shadows. Utmost scale, permanence, enterprise security. Minimalist, awe-inspiring.',
            diagram: 'Brutalist concrete diagram. Massive slabs forming system architecture. Raw formwork texture. Harsh shadows defining connections. Monumental scale.',
            chart: 'Huge heavy slabs of cast concrete stacked to form physical unmovable data chart. Brutalist texture. Dramatic shadow and light.',
            icon: 'Brutalist concrete icon. Single heavy geometric concrete form. Visible texture. Harsh shadow. Permanent, secure.',
        },
        negativeConstraints: 'No color, no playful elements, no lightweight materials, no digital gloss.',
        motionStyle: 'Slow drone-like architectural tracking shots. Only movement is slow crawl of harsh sunlight and shadows.',
    },
    {
        id: 'fabric_dynamics',
        name: 'Ethereal Fabric Dynamics',
        shortLabel: 'Fabric',
        description: 'Protective, flexible, enveloping. Silk catching and softening the blow.',
        verticals: 'Insurance, HR Benefits, Healthcare, Consumer Goods',
        promptBase: {
            portrait: 'Portrait swathed in flowing protective layers of pearlescent fabric. Silk and satin dynamics. Soft studio lighting. Jewel-toned color shifts. Elegant, soothing.',
            scene: 'Ethereal 3D fabric dynamics illustration. Vast weightless sheets of premium silk and satin flowing in slow motion. Pearlescent shimmering surfaces catching soft studio lighting. Protective, flexible, enveloping. Elegant, soothing, premium. Pastel and jewel-toned color shifts. Flawless cloth physics and soft folds.',
            diagram: 'Fabric dynamics diagram. Flowing ribbons of satin connecting system nodes. Protective layers draping over delicate components. Jewel-toned, premium.',
            chart: 'Line graph where the line is physical flowing ribbon of satin dancing in wind. Pearlescent surface. Soft studio lighting. Premium data visualization.',
            icon: 'Flowing silk ribbon icon. Single elegant fabric curve. Pearlescent shimmer. Jewel-toned.',
        },
        negativeConstraints: 'No harsh edges, no mechanical elements, no dark moody lighting, no gritty textures.',
        motionStyle: 'Utterly hypnotic slow-motion cloth simulation. Light ripples continuously across threading.',
    },
    {
        id: 'retro_terminal',
        name: 'Retro-Terminal Data Matrix',
        shortLabel: 'Terminal',
        description: 'Developer-first, raw logic, backend authority. Monospaced code as visual language.',
        verticals: 'DevOps, API Platforms, Engineering Tools',
        promptBase: {
            portrait: 'Terminal portrait. Person represented by flashing cursor and command prompt. Glowing amber monospaced text on rich black. CRT scanlines. Pure developer aesthetic.',
            scene: 'Retro-terminal UI data matrix illustration. Pure developer aesthetic. Monospaced typography, ASCII art, command-line interfaces. Glowing amber or phosphor green text on deep rich black background. Subtle CRT scanlines and chromatic aberration. Raw logic, engineering-focused, unpretentious.',
            diagram: 'ASCII art system diagram. Monospaced box-drawing characters connecting modules. Glowing green on black. CRT monitor aesthetic. Terminal commands as labels.',
            chart: 'Chart rendered entirely in aligned glowing green/amber characters on CRT monitor texture. ASCII bar graphs. Scanline overlay.',
            icon: 'Terminal icon. Single glowing character or command symbol. Phosphor green on black. CRT scanline texture.',
        },
        negativeConstraints: 'No color beyond green/amber on black, no photography, no illustration, no modern UI.',
        motionStyle: 'Rapid typing animations, cursor blinking, screen tearing, cathode-ray tube hum.',
    },
    {
        id: 'thermal_heatmap',
        name: 'Vivid Thermal Heatmapping',
        shortLabel: 'Thermal',
        description: 'Real-time, reactive, urgent. Friction shown as red-hot anomalies.',
        verticals: 'Logistics, Threat Detection, High-Frequency Trading',
        promptBase: {
            portrait: 'Thermal camera heatmap portrait. Glowing silhouette focused on action/heat signature. Striking gradients from midnight blue to magenta to white-hot yellow. Infrared aesthetic.',
            scene: 'Vivid thermal camera heatmapping illustration. Infrared aesthetic. Striking continuous gradients from deep midnight blue to magenta, fiery orange, and glowing white-hot yellow. Fluid reactive data zones. High intensity, real-time analytics. Soft blurred edges where temperatures meet. Pure data-driven color.',
            diagram: 'Thermal heatmap diagram. System nodes as heat signatures. Connections glow with data flow intensity. Midnight blue to white-hot gradient. No hard lines.',
            chart: 'Literal heat signature chart. Hotspots dictate action (crimson), cool zones dictate stability (deep blue). Infrared gradient, soft edges, reactive.',
            icon: 'Thermal icon. Glowing gradient from blue core to orange/yellow edge. Infrared heat signature. Reactive, urgent.',
        },
        negativeConstraints: 'No hard lines, no cartoon, no corporate blue, no flat design.',
        motionStyle: 'Shifting blooming thermal gradients. Problems solved shift from crimson to calm deep violet.',
    },
    {
        id: 'collage_disruptor',
        name: 'Editorial Collage Disruptor',
        shortLabel: 'Collage',
        description: 'Provocative, anti-corporate. Ripped vintage meets hyper-modern digital.',
        verticals: 'Creative Agencies, Marketing Startups, Cultural Brands',
        promptBase: {
            portrait: 'Disruptive editorial collage portrait. Classic 1950s business person with head replaced by glowing modern 3D tech object. Ripped halftone vintage photography. Spray paint textures, tape.',
            scene: 'Disruptive editorial mixed-media collage illustration. Punk-aesthetic combined with high-end tech. Ripped halftone vintage photographs interacting with pristine neon 3D shapes and flat vector UI elements. Chaotic but perfectly balanced. Spray paint textures, ripped paper edges, tape. Provocative, anti-establishment.',
            diagram: 'Torn paper rip diagram. Vintage paper layer revealing hyper-modern digital world underneath. Neon 3D connections over halftone backgrounds. Spray paint annotations.',
            chart: 'Chart made of torn newspaper clippings, spray paint, and pristine vector lines drawn over the mess. Controlled chaos data visualization.',
            icon: 'Collage icon. Ripped halftone paper with neon 3D shape emerging. Tape holding it together. Punk meets premium.',
        },
        negativeConstraints: 'No clean corporate design, no stock photography, no minimal aesthetic.',
        motionStyle: 'Stop-motion jitter. Paper rips and tears dynamically. Elements taped and glued frame-by-frame.',
    },
    {
        id: 'geometric_wireframe',
        name: 'Geometric Line-Art Layering',
        shortLabel: 'Wireframe',
        description: 'Transparent, complex but ordered, lightweight. Every internal connection visible.',
        verticals: 'Cloud Computing, Network Architecture, Org Design',
        promptBase: {
            portrait: 'Geometric transparent line-art portrait. Overlapping fine lines creating human volume without solid fills. Subtle color shifts at intersections. Hair-thin strokes. Architectural transparency.',
            scene: 'Geometric transparent line-art layering illustration. Intricate overlapping fine lines creating volume and depth without solid fills. Architectural transparency. Complex networks through perfectly uniform hair-thin strokes. Subtle color shifts where lines intersect. Lightweight, infinite, organized. Pure structural linework.',
            diagram: 'Transparent wireframe diagram. Overlapping fine-line layers showing all connections simultaneously. Moire patterns at intersections. Hair-thin strokes, no fills.',
            chart: 'Overlapping fine-line circular chart diagrams. Intersections create dense darker color meshes. Pure linework data visualization. Architectural transparency.',
            icon: 'Geometric wireframe icon. Overlapping fine lines creating 3D form from 2D strokes. Transparent, structural.',
        },
        negativeConstraints: 'No shading, no solid fills, no heavy strokes, no photorealism.',
        motionStyle: 'Slow rotation of 3D line-art model. Overlapping lines create mesmerizing moire patterns.',
    },
    {
        id: 'isometric_city',
        name: 'Isometric Micro-City Sim',
        shortLabel: 'Iso City',
        description: 'Macro-control, systemic interaction. Product ecosystems as bustling miniature cities.',
        verticals: 'Smart Cities, IoT, Complex Platform Ecosystems',
        promptBase: {
            portrait: 'Isometric micro-city with thousands of tiny perfectly modeled citizens. Tilt-shift photography. Glowing data streams through miniature streets. Smart city aesthetic.',
            scene: 'Isometric 3D micro-city simulation render. Gods-eye view of highly detailed bustling miniature ecosystem. Tilt-shift photography with shallow depth of field. Glowing data streams pulsing through miniature streets and buildings. High-tech smart city. Clean, optimistic, structured. Bright vivid friendly corporate lighting.',
            diagram: 'Isometric city diagram. Buildings represent system components (height = importance). Streets are data flows. Glowing pulses show traffic. Tilt-shift miniature.',
            chart: 'City buildings as bar chart. Building height represents data values. Traffic flow represents transfer rates. Isometric tilt-shift. Vivid, friendly.',
            icon: 'Isometric building icon. Single miniature smart-city structure with glowing data pulse. Tilt-shift blur edges.',
        },
        negativeConstraints: 'No flat 2D, no dark moody lighting, no abstract shapes, no minimalism.',
        motionStyle: 'Seamless infinite loops. Hovering vehicles, data pulses through glowing streets. Deeply satisfying.',
    },
    {
        id: 'cyber_noir',
        name: 'Neon Cyber-Noir',
        shortLabel: 'Cyber',
        description: 'Bleeding-edge, nocturnal, high-stakes. Obsidian cubes humming with magenta light.',
        verticals: 'Offensive Cybersecurity, Crypto/Web3, Dark-Web Monitoring',
        promptBase: {
            portrait: 'Neon cyber-noir portrait. Silhouette lit only by intense neon cyan and magenta from screens. Volumetric fog. Rain-slicked reflections. Holographic UI elements. Gritty, cinematic.',
            scene: 'Neon cyber-noir 3D illustration. Pitch black moody atmospheric environment lit exclusively by intense neon cyan and magenta. Volumetric fog, rain-slicked reflective surfaces. Bleeding-edge tech, high-stakes cybersecurity. Holographic UI floating in dark. Gritty, cinematic, nocturnal.',
            diagram: 'Cyber-noir diagram. Glowing holographic nodes floating in dark volumetric fog. Neon cyan connections. Rain-slicked reflective surface. Magenta threat indicators.',
            chart: 'Glowing holographic chart floating in dark atmospheric rain-slicked environment. Neon cyan data, magenta anomalies. Volumetric fog. Cinematic.',
            icon: 'Neon cyber icon. Glowing cyan shape on pitch black. Magenta accent. Holographic edge effect. Nocturnal.',
        },
        negativeConstraints: 'No daylight, no warm colors, no friendly aesthetic, no flat design.',
        motionStyle: 'Flickering neon tubes, volumetric fog rolling over structures, cinematic moody camera drift.',
    },
    {
        id: 'atmospheric_vector',
        name: 'Atmospheric Depth-of-Field Vector',
        shortLabel: 'Epic',
        description: 'Majestic, focused, deeply cinematic. Grand visions with epic scale and glowing horizons.',
        verticals: 'Enterprise Vision, Environmental, Long-Term Strategy',
        promptBase: {
            portrait: 'Cinematic atmospheric vector portrait. Highly stylized figure gazing toward glowing horizon. Extreme depth of field blur. Rich atmospheric color grading. Majestic, forward-looking.',
            scene: 'Cinematic atmospheric vector illustration. Massive sense of scale and deep Z-axis depth of field. Stylized flat vector art utilizing extreme blur on foreground and background to simulate high-end lens. Majestic, forward-looking, epic corporate strategy. Rich atmospheric color grading, glowing horizons.',
            diagram: 'Atmospheric depth diagram. Data integrated into vast landscape (mountain ranges as trend lines). Extreme parallax depth. Glowing sunrise horizon. Epic scale.',
            chart: 'Data as distant landscape features. Mountain peaks as high values, valleys as lows. Atmospheric color grading. Glowing horizon light. Majestic scale.',
            icon: 'Atmospheric icon. Layered depth silhouette with glowing horizon line. Rich color grading. Cinematic, epic.',
        },
        negativeConstraints: 'No flat 2D without depth, no small scale, no corporate sterility, no clip art.',
        motionStyle: 'Parallax scrolling. Foreground moves quickly, midground slowly, background monumental and still.',
    },
];

export const DEFAULT_STYLE_ID = 'atmospheric_vector';

export function getStyleById(id: string): VisualizationStyle {
    return VISUALIZATION_STYLES.find(s => s.id === id) || VISUALIZATION_STYLES[0];
}

export function buildStyledPrompt(
    styleId: string,
    context: 'portrait' | 'scene' | 'diagram' | 'chart' | 'icon',
    subject: string
): string {
    const style = getStyleById(styleId);
    const base = style.promptBase[context];
    return `${base}. Subject: ${subject}. ${style.negativeConstraints}`;
}
