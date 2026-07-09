import * as React from 'react';
import { Separator } from 'nxt-proto-ds';

export const Horizontal = () => (
  <div style={{ maxWidth: 360 }}>
    <div className="text-micro font-title font-semibold text-ink">Plan design findings</div>
    <p className="text-nano text-muted-foreground" style={{ marginTop: 4 }}>
      Benchmarks against similar-size employers.
    </p>
    <Separator style={{ marginTop: 12, marginBottom: 12 }} />
    <p className="text-micro text-ink">
      Dependent coverage grew while high-deductible enrollment held flat.
    </p>
  </div>
);

export const VerticalMeta = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 20, maxWidth: 420 }}>
    <span className="text-nano text-grey">Cass County</span>
    <Separator orientation="vertical" />
    <span className="text-nano text-grey">Row crops</span>
    <Separator orientation="vertical" />
    <span className="text-nano text-grey">2026 season</span>
  </div>
);
