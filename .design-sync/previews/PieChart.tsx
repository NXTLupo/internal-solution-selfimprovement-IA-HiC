import * as React from 'react';
import { PieChart } from 'nxt-proto-ds';

export const ClaimMix = () => (
  <PieChart
    title="Claim mix by peril"
    data={[
      { label: 'Hail', value: 342 },
      { label: 'Flood', value: 218 },
      { label: 'Wind', value: 187 },
      { label: 'Other', value: 137 },
    ]}
    centerLabel="claims"
    legend={['Hail', 'Flood', 'Wind', 'Other']}
    style={{ width: 320 }}
  />
);

export const CustomCenter = () => (
  <PieChart
    title="Enrollment share"
    data={[
      { label: 'Silver', value: 2860 },
      { label: 'Gold', value: 1975 },
      { label: 'Bronze', value: 1240 },
    ]}
    centerValue="6,075"
    centerLabel="members"
    style={{ width: 320 }}
  />
);
