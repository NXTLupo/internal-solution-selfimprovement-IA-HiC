import * as React from 'react';
import { Empty } from 'nxt-proto-ds';

export const WithAction = () => (
  <Empty
    style={{ maxWidth: 360 }}
    title="No engagements yet"
    description="Upload a client brief or pick a research pack to start your first run."
    actionLabel="Start a research run"
  />
);

export const QuietState = () => (
  <Empty
    style={{ maxWidth: 360 }}
    title="No saved filters"
    description="Filters you save from the corpus view appear here."
  />
);
