import * as React from 'react';
import { Input, Label } from 'nxt-proto-ds';

export const Basic = () => (
  <div style={{ maxWidth: 360 }}>
    <Input placeholder="Search counties or plan names" />
  </div>
);

export const WithLabel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="acres">Insured acreage</Label>
    <Input id="acres" defaultValue="1,240" />
  </div>
);

export const Types = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
    <Input type="email" placeholder="advisor@nxthumans.com" />
    <Input type="number" placeholder="Deductible amount" />
    <Input type="date" defaultValue="2026-03-31" />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 360 }}>
    <Input disabled defaultValue="Locked after renewal window closes" />
  </div>
);
