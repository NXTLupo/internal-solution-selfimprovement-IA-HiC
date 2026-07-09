import * as React from 'react';
import { NotifList } from 'nxt-proto-ds';

export const Mixed = () => (
  <NotifList
    style={{ maxWidth: 380 }}
    items={[
      { title: 'Maya approved the Q3 benefits brief', time: '4m ago', unread: true },
      { title: 'Corpus sync finished for Meridian Health', time: '22m ago', unread: true },
      { title: 'Deck export ready: enrollment-strategy.pptx', time: '1h ago' },
      { title: 'Priya commented on the persona set', time: 'Yesterday' },
    ]}
  />
);

export const AllRead = () => (
  <NotifList
    style={{ maxWidth: 380 }}
    items={[
      { title: 'Weekly digest: 12 new sources matched your goal', time: 'Mon' },
      { title: 'Storage nearing plan limit', time: 'Last week' },
    ]}
  />
);
