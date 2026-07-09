import * as React from 'react';
import { FunnelChart } from 'nxt-proto-ds';

export const ResearchPipeline = () => (
  <FunnelChart
    title="Source pipeline, this cycle"
    style={{ width: 360 }}
    data={[
      { label: 'Collected', value: 1840 },
      { label: 'Triaged', value: 920 },
      { label: 'Cited', value: 310 },
      { label: 'In report', value: 88 },
    ]}
  />
);

export const WithLegend = () => (
  <FunnelChart
    title="Trial conversion"
    legend={['This quarter']}
    style={{ width: 360 }}
    data={[
      { label: 'Signups', value: 2400 },
      { label: 'Activated', value: 1150 },
      { label: 'Paid', value: 420 },
    ]}
  />
);
