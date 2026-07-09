import * as React from 'react';
import { NativeAd } from 'nxt-proto-ds';

export const SponsoredCard = () => (
  <NativeAd
    advertiser="Bluepine Advisory"
    title="Benefits benchmarking, without the six-week wait"
    body="Compare your plan mix against sector peers before the renewal window closes."
    cta="See the benchmark"
    style={{ width: 380 }}
  />
);

export const MinimalPromoted = () => (
  <NativeAd
    advertiser="Harbor Analytics"
    sponsoredLabel="Promoted"
    title="Turn survey data into partner-ready findings"
    style={{ width: 380 }}
  />
);
