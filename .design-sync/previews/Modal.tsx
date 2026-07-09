import * as React from 'react';
import { Modal } from 'nxt-proto-ds';

// The component's own bg-rail/60 scrim class is missing from the built CSS
// (tailwind config defines rail without <alpha-value>, safelist is exact-match),
// so the scrim wash is reproduced here from the same rail token.
const scrimFill: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-rail) 60%, transparent)',
};

export const ConfirmChange = () => (
  <Modal
    title="Switch to the high-deductible plan?"
    body="Your current coverage ends on the last day of this month. The new plan starts the first of next month with no gap."
    cancelLabel="Keep current plan"
    confirmLabel="Switch plan"
    style={{ width: 520, ...scrimFill }}
  />
);

export const DestructiveConfirm = () => (
  <Modal
    title="Delete this saved report?"
    body="The drought exposure report for Dawson County will be removed for everyone on your team."
    confirmLabel="Delete report"
    destructive
    style={{ width: 520, ...scrimFill }}
  />
);
