import * as React from 'react';
import { LineChart } from 'nxt-proto-ds';

export const EnrollmentTrend = () => (
  <LineChart
    title="Plan enrollment by month"
    series={[4120, 4380, 4310, 4720, 5060, 5240, 5410, 5620]}
    labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']}
    style={{ width: 360 }}
  />
);

export const BareTrend = () => (
  <LineChart
    title="Weekly claim volume"
    series={[62, 58, 71, 66, 84, 79, 92]}
    legend={['Claims filed']}
    style={{ width: 360 }}
  />
);
