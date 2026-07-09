import * as React from 'react';
import { Agent } from 'nxt-proto-ds';

export const MidRun = () => (
  <Agent
    style={{ maxWidth: 420 }}
    steps={[
      { label: 'Search the corpus for churn mentions', status: 'done' },
      { label: 'Cluster support tickets by theme', status: 'done' },
      { label: 'Cross-check clusters against cancellations', status: 'active', detail: 'working...' },
      { label: 'Draft the cited brief', status: 'pending' },
    ]}
  />
);

export const CompletedPlan = () => (
  <Agent
    style={{ maxWidth: 420 }}
    steps={[
      { label: 'Pull Q2 retention interviews', status: 'done' },
      { label: 'Extract renewal-risk quotes', status: 'done' },
      { label: 'Assemble the evidence table', status: 'done', detail: 'done in 41s' },
    ]}
  />
);
