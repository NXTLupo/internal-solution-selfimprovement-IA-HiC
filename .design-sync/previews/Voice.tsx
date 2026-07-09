import * as React from 'react';
import { Voice } from 'nxt-proto-ds';

export const Listening = () => (
  <Voice label="Listening..." style={{ width: 320 }} />
);

export const Transcribing = () => (
  <Voice label="Heard: analyze churn drivers for enterprise accounts" style={{ width: 320 }} />
);
