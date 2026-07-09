import * as React from 'react';
import { Badge } from 'nxt-proto-ds';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', maxWidth: 420 }}>
    <Badge>High priority</Badge>
    <Badge variant="secondary">Draft</Badge>
    <Badge variant="outline">County data</Badge>
    <Badge variant="success">Verified</Badge>
    <Badge variant="info">External source</Badge>
    <Badge variant="destructive">Coverage lapsed</Badge>
  </div>
);

export const StatusRow = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 420 }}>
    <span className="text-micro text-ink">Enrollment file, April cycle</span>
    <Badge variant="success">Processed</Badge>
  </div>
);

export const RiskTiers = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 420 }}>
    <Badge variant="destructive">Flood: elevated</Badge>
    <Badge variant="secondary">Drought: neutral</Badge>
    <Badge variant="outline">Hail: watch</Badge>
  </div>
);
