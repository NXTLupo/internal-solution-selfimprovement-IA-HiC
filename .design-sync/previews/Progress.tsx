import * as React from 'react';
import { Progress, Label } from 'nxt-proto-ds';

export const Levels = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
    <Progress value={18} />
    <Progress value={52} />
    <Progress value={86} />
  </div>
);

export const WithCaption = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Label>Enrollment file processing</Label>
      <span className="text-nano text-grey">Step three of four</span>
    </div>
    <Progress value={72} />
  </div>
);

export const Complete = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
    <Label>Benchmark run finished</Label>
    <Progress value={100} />
  </div>
);
