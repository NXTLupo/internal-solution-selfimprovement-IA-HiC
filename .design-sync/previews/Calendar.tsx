import * as React from 'react';
import { Calendar } from 'nxt-proto-ds';

export const SelectedWithEvents = () => (
  <Calendar month={2} year={2026} selected={12} marked={[3, 9, 17, 24]} />
);

export const PlainMonth = () => <Calendar month={9} year={2026} />;
