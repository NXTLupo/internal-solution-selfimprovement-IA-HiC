import * as React from 'react';
import { Stepper } from 'nxt-proto-ds';

export const MidFlow = () => (
  <Stepper
    steps={['Upload sources', 'Set objective', 'Review themes', 'Export brief']}
    current={2}
  />
);

export const JustStarted = () => (
  <Stepper steps={['Connect corpus', 'Pick model', 'Run analysis']} current={0} />
);

export const FinalStep = () => (
  <Stepper
    steps={['Upload sources', 'Set objective', 'Review themes', 'Export brief']}
    current={3}
  />
);
