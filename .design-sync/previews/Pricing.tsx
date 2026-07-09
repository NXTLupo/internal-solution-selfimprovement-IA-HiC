import * as React from 'react';
import { Pricing } from 'nxt-proto-ds';

export const ThreeTier = () => (
  <Pricing
    highlight={1}
    style={{ width: 720 }}
    plans={[
      {
        name: 'Starter',
        price: '$29',
        period: '/mo',
        features: ['1 workspace', '50 sources per corpus', 'Cited chat answers', 'PDF export'],
        cta: 'Start free trial',
      },
      {
        name: 'Team',
        price: '$79',
        period: '/mo per seat',
        features: [
          'Unlimited workspaces',
          '500 sources per corpus',
          'Deck and doc export',
          'Shared evidence library',
          'Priority support',
        ],
        cta: 'Choose Team',
      },
      {
        name: 'Enterprise',
        price: '$210',
        period: '/mo per seat',
        features: ['SSO and audit logs', 'Private model routing', 'Custom retention rules', 'Dedicated onboarding'],
        cta: 'Talk to sales',
      },
    ]}
  />
);

export const NoHighlight = () => (
  <Pricing
    style={{ width: 720 }}
    plans={[
      {
        name: 'Research',
        price: '$49',
        period: '/mo',
        features: ['Corpus chat', 'Source triage queue'],
        cta: 'Select',
      },
      {
        name: 'Delivery',
        price: '$99',
        period: '/mo',
        features: ['Everything in Research', 'Slide export', 'Brand templates'],
        cta: 'Select',
      },
      {
        name: 'Practice',
        price: '$189',
        period: '/mo',
        features: ['Everything in Delivery', 'Portfolio analytics', 'Admin controls'],
        cta: 'Select',
      },
    ]}
  />
);
