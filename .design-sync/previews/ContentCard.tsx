import * as React from 'react';
import { ContentCard } from 'nxt-proto-ds';

export const Playbook = () => (
  <ContentCard
    style={{ maxWidth: 280 }}
    category="Playbook"
    title="Open enrollment communication playbook"
    support="Twelve channel-by-channel moves that lift plan comprehension before the election window."
    primaryAction="Open"
    secondaryAction="Save"
  />
);

export const CaseStudy = () => (
  <ContentCard
    style={{ maxWidth: 280 }}
    category="Case study"
    title="How Meridian cut benefits call volume"
    support="A self-service decision tool moved routine plan questions out of the call center."
    primaryAction="Read"
  />
);

export const Minimal = () => (
  <ContentCard
    style={{ maxWidth: 280 }}
    title="Preventive care utilization brief"
  />
);
