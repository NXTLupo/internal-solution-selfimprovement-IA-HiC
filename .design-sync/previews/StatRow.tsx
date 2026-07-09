import * as React from 'react';
import { StatRow } from 'nxt-proto-ds';

export const KpiBand = () => (
  <StatRow
    style={{ maxWidth: 560 }}
    stats={[
      { label: 'Proposals sent', value: '38', delta: '12%', deltaDirection: 'up', sub: 'vs. last quarter' },
      { label: 'Win rate', value: '41%', delta: '3 pts', deltaDirection: 'up', sub: 'trailing four quarters' },
      { label: 'Avg. cycle', value: '54 days', delta: '6 days', deltaDirection: 'down', sub: 'vs. last quarter' },
    ]}
  />
);

export const PlanMetrics = () => (
  <StatRow
    style={{ maxWidth: 560 }}
    stats={[
      { label: 'Enrolled employees', value: '2,340', sub: 'April cycle' },
      { label: 'Dependent coverage', value: '61%', delta: '4 pts', deltaDirection: 'up', sub: 'vs. prior year' },
      { label: 'Pending verifications', value: '17', delta: '9', deltaDirection: 'down', sub: 'since Monday' },
    ]}
  />
);

export const PairOnly = () => (
  <StatRow
    style={{ maxWidth: 420 }}
    stats={[
      { label: 'Insured acreage', value: '1,240', sub: 'Cass County parcels' },
      { label: 'Premium change', value: '+8.2%', delta: '2.1 pts', deltaDirection: 'up', sub: 'renewal estimate' },
    ]}
  />
);
