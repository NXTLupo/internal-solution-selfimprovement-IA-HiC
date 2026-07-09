import * as React from 'react';
import { Label, Input, Checkbox } from 'nxt-proto-ds';

export const Standalone = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
    <Label>Research objective</Label>
    <Label>County of primary operation</Label>
    <Label>Plan renewal date</Label>
  </div>
);

export const WithField = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
    <Label htmlFor="goal">Engagement goal</Label>
    <Input id="goal" placeholder="Reduce first-year attrition in the co-op program" />
  </div>
);

export const WithCheckbox = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 360 }}>
    <Checkbox id="external" checked />
    <Label htmlFor="external">Prioritize external intelligence sources</Label>
  </div>
);
