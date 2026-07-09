/** Tailwind theme bound to the generated token layer (tokens.css) - the classes the
 * design agent writes (bg-primary, text-muted-foreground, font-display, rounded-md...)
 * all resolve through the Figma-token CSS variables; zero literal values here. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  // The design agent composes NEW layouts against this vocabulary at design time;
  // Tailwind otherwise purges unused utilities, so the token-bound set ships whole.
  safelist: [
    { pattern: /^(bg|text|border)-(rail|ink|brand-accent|on-brand-accent|cyan|rust|teal|ecru|paper|grey|hairline|success)(\/\d+)?$/ },
    { pattern: /^(bg|text|border)-(background|foreground|primary|secondary|muted|accent|destructive|card|border)$/ },
    { pattern: /^(bg|text)-(primary|secondary|muted|accent|destructive|card)-foreground$/ },
    { pattern: /^font-(display|title|body|mono)$/ },
    { pattern: /^text-(nano|micro|label|caption|kicker)$/ },
    { pattern: /^rounded-(sm|md|lg)$/ },
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // NXT brand namespace (raw Figma tokens) for brand-specific accents
        rail: 'rgb(var(--color-rail-rgb) / <alpha-value>)',
        ink: 'rgb(var(--color-ink-rgb) / <alpha-value>)',
        'brand-accent': 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'on-brand-accent': 'var(--color-on-accent)',
        cyan: 'rgb(var(--color-cyan-rgb) / <alpha-value>)',
        rust: 'rgb(var(--color-rust-rgb) / <alpha-value>)',
        teal: 'rgb(var(--color-teal-rgb) / <alpha-value>)',
        ecru: 'rgb(var(--color-ecru-rgb) / <alpha-value>)',
        paper: 'rgb(var(--color-paper-rgb) / <alpha-value>)',
        grey: 'rgb(var(--color-grey-rgb) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline-rgb) / <alpha-value>)',
        success: 'rgb(var(--color-success-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        title: ['var(--font-title)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        nano: 'var(--type-scale-nano)',
        micro: 'var(--type-scale-micro)',
        label: 'var(--type-scale-label)',
        caption: 'var(--type-scale-caption)',
        kicker: 'var(--type-scale-kicker)',
      },
      borderRadius: {
        lg: 'calc(var(--radius) + 4px)',
        md: 'calc(var(--radius) + 1px)',
        sm: 'var(--radius)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
