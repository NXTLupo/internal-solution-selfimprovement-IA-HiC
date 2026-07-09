import * as React from 'react';
import { Hero } from 'nxt-proto-ds';

export const Landing = () => (
  <Hero
    headline="Know your farm risk before the season does"
    sub="Check flood, drought, and input-cost exposure for your county in under two minutes."
    cta="Check my farm risk"
    secondaryCta="View sample report"
    style={{ width: 640 }}
  />
);

export const WithKicker = () => (
  <Hero
    kicker="Benefits intelligence"
    headline="Every plan decision, grounded in your own claims data"
    sub="Benchmarks from 6,000 industry plans meet your enrollment file."
    cta="Open the workbench"
    style={{ width: 640 }}
  />
);

export const LeftAligned = () => (
  <Hero
    align="left"
    headline="The quarterly review, assembled while you sleep"
    cta="Schedule a walkthrough"
    style={{ width: 640 }}
  />
);
