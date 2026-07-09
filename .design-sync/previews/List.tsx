import * as React from 'react';
import { List } from 'nxt-proto-ds';

export const Files = () => (
  <List
    style={{ maxWidth: 400 }}
    label="Recent uploads"
    items={[
      { title: 'Q3 benefits utilization brief.pdf', meta: 'Edited 2h ago - 1.2 MB' },
      { title: 'Enrollment survey raw export.csv', meta: 'Uploaded yesterday - 640 KB' },
      { title: 'Broker interview notes.docx', meta: 'Uploaded Mon - 88 KB' },
    ]}
    onItemClick={() => {}}
  />
);

export const Transactions = () => (
  <List
    style={{ maxWidth: 400 }}
    label="Plan invoices"
    items={[
      { title: 'March platform invoice', meta: 'Paid Mar 3', value: '$4,200' },
      { title: 'February platform invoice', meta: 'Paid Feb 3', value: '$4,200' },
      { title: 'Seat expansion, research desk', meta: 'Paid Jan 18', value: '$860' },
    ]}
  />
);
