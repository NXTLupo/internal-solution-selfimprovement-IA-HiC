import * as React from 'react';
import { Button } from 'nxt-proto-ds';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
    <Button>Check my farm risk</Button>
    <Button variant="secondary">Save for later</Button>
    <Button variant="outline">View sample report</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="destructive">Delete account</Button>
    <Button variant="link">Methodology</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button size="sm">Small action</Button>
    <Button size="default">Default action</Button>
    <Button size="lg">Large action</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button disabled>Submitting request</Button>
    <Button variant="outline" disabled>Unavailable</Button>
  </div>
);
