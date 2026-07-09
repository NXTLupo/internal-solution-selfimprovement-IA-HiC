import * as React from 'react';
import { Breadcrumb } from 'nxt-proto-ds';

export const DeepTrail = () => (
  <Breadcrumb
    items={[
      { label: 'Library', href: '#' },
      { label: 'Retention research', href: '#' },
      { label: 'Q2 interviews', href: '#' },
      { label: 'Churn drivers brief' },
    ]}
  />
);

export const TwoLevels = () => (
  <Breadcrumb
    items={[
      { label: 'Sources', href: '#' },
      { label: 'Support ticket export' },
    ]}
  />
);
