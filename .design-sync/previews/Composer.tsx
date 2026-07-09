import * as React from 'react';
import { Composer } from 'nxt-proto-ds';

export const Empty = () => (
  <Composer
    placeholder="Ask about the churn corpus..."
    style={{ maxWidth: 480 }}
  />
);

export const Drafted = () => (
  <Composer
    value="Analyze churn drivers for enterprise accounts"
    style={{ maxWidth: 480 }}
  />
);

export const Streaming = () => (
  <Composer
    placeholder="Assistant is responding..."
    disabled
    style={{ maxWidth: 480 }}
  />
);
