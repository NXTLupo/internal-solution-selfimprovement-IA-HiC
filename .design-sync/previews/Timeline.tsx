import * as React from 'react';
import { Timeline } from 'nxt-proto-ds';

export const ClaimHistory = () => (
  <Timeline
    label="Claim 4417 history"
    events={[
      { time: 'Mar 3, 09:12', title: 'Claim filed', desc: 'Hail damage reported for the north barley field.' },
      { time: 'Mar 4, 14:30', title: 'Adjuster assigned', desc: 'Field visit scheduled within five business days.' },
      { time: 'Mar 9, 11:05', title: 'Site inspection complete' },
      { time: 'Mar 12, 08:40', title: 'Payout approved', desc: 'Settlement issued to the account on file.' },
    ]}
    style={{ width: 340 }}
  />
);

export const PlanRollout = () => (
  <Timeline
    events={[
      { time: 'Week 1', title: 'Enrollment window opens' },
      { time: 'Week 3', title: 'Dependent verification', desc: 'Documents reviewed for all family-tier plans.' },
      { time: 'Week 6', title: 'Coverage effective' },
    ]}
    style={{ width: 340 }}
  />
);
