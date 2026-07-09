import * as React from 'react';
import { Starters } from 'nxt-proto-ds';

export const EmptyStateGrid = () => (
  <Starters
    style={{ maxWidth: 480 }}
    starters={[
      { title: 'Analyze churn drivers', sub: 'Rank the reasons enterprise accounts cancel' },
      { title: 'Summarize interviews', sub: 'Key quotes from the Q2 retention calls' },
      { title: 'Compare plan cohorts', sub: 'Renewal behavior by pricing tier' },
      { title: 'Draft an exec brief', sub: 'One page on onboarding friction' },
    ]}
  />
);

export const PairOfPrompts = () => (
  <Starters
    style={{ maxWidth: 480 }}
    starters={[
      { title: 'Find contradicting sources', sub: 'Where the NPS export disagrees with interviews' },
      { title: 'Trace a cited claim', sub: 'Show every passage behind the setup-friction finding' },
    ]}
  />
);
