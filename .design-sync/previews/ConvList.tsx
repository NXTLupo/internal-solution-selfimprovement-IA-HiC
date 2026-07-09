import * as React from 'react';
import { ConvList } from 'nxt-proto-ds';

export const GroupedHistory = () => (
  <ConvList
    style={{ width: 260 }}
    groups={[
      {
        label: 'Today',
        items: [
          { title: 'Churn drivers in enterprise segment', active: true },
          { title: 'Q2 retention interview summary' },
        ],
      },
      {
        label: 'Previous 7 days',
        items: [
          { title: 'Onboarding funnel drop-off analysis' },
          { title: 'Pricing-tier renewal comparison' },
          { title: 'Support ticket theme clustering' },
        ],
      },
    ]}
  />
);

export const SingleGroup = () => (
  <ConvList
    style={{ width: 260 }}
    groups={[
      {
        label: 'Pinned',
        items: [
          { title: 'Exec brief: onboarding friction', active: true },
          { title: 'Citation audit for churn brief' },
        ],
      },
    ]}
  />
);
