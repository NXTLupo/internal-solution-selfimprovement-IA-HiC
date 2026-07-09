import * as React from 'react';
import { Reasoning } from 'nxt-proto-ds';

export const ExpandedTrace = () => (
  <Reasoning summary="Weighing churn evidence" badge="thought 6s" style={{ maxWidth: 480 }}>
    The user asked for churn drivers, so retention interviews rank above the NPS export.
    Cross-checking the support-ticket cluster against the cancellation dates shows the
    setup-confusion tickets lead cancellations by roughly one quarter, which makes
    onboarding friction the primary candidate over pricing.
  </Reasoning>
);

export const CollapsedRow = () => (
  <Reasoning summary="Show reasoning" badge="thought 2s" open={false} style={{ maxWidth: 480 }}>
    Hidden trace body.
  </Reasoning>
);
