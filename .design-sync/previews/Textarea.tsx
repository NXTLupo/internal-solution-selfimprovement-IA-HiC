import * as React from 'react';
import { Textarea, Label } from 'nxt-proto-ds';

export const Basic = () => (
  <div style={{ maxWidth: 380 }}>
    <Textarea placeholder="Describe the research objective for this engagement..." />
  </div>
);

export const WithLabel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
    <Label htmlFor="notes">Advisor notes</Label>
    <Textarea
      id="notes"
      defaultValue="Client wants the renewal analysis framed around dependent coverage growth; the board reads the summary before the March 31 lock."
      rows={4}
    />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 380 }}>
    <Textarea disabled defaultValue="Notes lock once the engagement report is published." rows={3} />
  </div>
);
