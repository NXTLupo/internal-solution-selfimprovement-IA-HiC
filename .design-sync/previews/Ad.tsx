import * as React from 'react';
import { Ad } from 'nxt-proto-ds';

export const BannerWithCta = () => (
  <Ad
    headline="Benchmark your benefits plan against 6,000 peers"
    body="Free plan-mix report for HR teams of 500+."
    cta="Get the report"
    style={{ width: 560 }}
  />
);

export const HeadlineOnly = () => (
  <Ad
    headline="The research workbench built for consulting teams"
    adLabel="SPONSORED"
    style={{ width: 560 }}
  />
);
