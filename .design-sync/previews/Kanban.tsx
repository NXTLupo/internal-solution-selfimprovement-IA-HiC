import * as React from 'react';
import { Kanban } from 'nxt-proto-ds';

export const ClaimsBoard = () => (
  <Kanban
    style={{ width: 520 }}
    columns={[
      {
        title: 'Intake',
        cards: [
          { title: 'Hail claim, Dawson County', meta: 'Filed Mon' },
          { title: 'Flood photo review', meta: 'Maya R.' },
          { title: 'Missing policy number', meta: 'Needs info' },
        ],
      },
      {
        title: 'In review',
        cards: [
          { title: 'Drought loss assessment', meta: 'Due Fri' },
          { title: 'Equipment damage estimate', meta: 'Tom K.' },
        ],
      },
      {
        title: 'Approved',
        cards: [{ title: 'Wind damage payout', meta: 'Settled' }],
      },
    ]}
  />
);

export const TwoColumns = () => (
  <Kanban
    style={{ width: 340 }}
    columns={[
      {
        title: 'Backlog',
        cards: [
          { title: 'Renewal notices batch', meta: 'Q2' },
          { title: 'Broker portal audit' },
        ],
      },
      {
        title: 'Done',
        cards: [{ title: 'Rate table refresh', meta: 'Shipped' }],
      },
    ]}
  />
);
