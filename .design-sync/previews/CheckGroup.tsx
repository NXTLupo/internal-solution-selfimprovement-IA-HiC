import * as React from 'react';
import { CheckGroup } from 'nxt-proto-ds';

export const SourceTypes = () => (
  <CheckGroup
    style={{ maxWidth: 320 }}
    legend="Include source types"
    options={[
      { value: 'academic', label: 'Academic journals', checked: true },
      { value: 'news', label: 'Industry news', checked: true },
      { value: 'social', label: 'Social listening' },
      { value: 'gov', label: 'Government data', checked: true },
    ]}
  />
);

export const Notifications = () => (
  <CheckGroup
    style={{ maxWidth: 320 }}
    legend="Email preferences"
    options={[
      { value: 'digest', label: 'Weekly research digest', checked: true },
      { value: 'mentions', label: 'Mentions and replies' },
      { value: 'billing', label: 'Billing receipts', checked: true, disabled: true },
    ]}
  />
);
