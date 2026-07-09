import * as React from 'react';
import { Checkbox, Label } from 'nxt-proto-ds';

export const States = () => (
  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
    <Checkbox checked />
    <Checkbox />
    <Checkbox checked disabled />
    <Checkbox disabled />
  </div>
);

export const WithLabels = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox id="flood" checked />
      <Label htmlFor="flood">Include flood exposure in the report</Label>
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox id="drought" checked />
      <Label htmlFor="drought">Include drought outlook</Label>
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox id="hail" />
      <Label htmlFor="hail">Include hail history</Label>
    </div>
  </div>
);

export const ConsentRow = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: 380 }}>
    <Checkbox id="consent" checked style={{ marginTop: 2 }} />
    <Label htmlFor="consent" className="leading-snug">
      Share anonymized enrollment data with the industry benchmark pool
    </Label>
  </div>
);
