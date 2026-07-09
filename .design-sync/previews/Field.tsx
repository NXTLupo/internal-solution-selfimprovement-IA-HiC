import * as React from 'react';
import { Field } from 'nxt-proto-ds';

export const Text = () => (
  <Field
    style={{ maxWidth: 340 }}
    label="Engagement name"
    placeholder="Q3 benefits utilization study"
  />
);

export const SearchKind = () => (
  <Field
    style={{ maxWidth: 340 }}
    label="Find a source"
    search
    placeholder="Search corpus, packs, uploads"
  />
);

export const Invalid = () => (
  <Field
    style={{ maxWidth: 340 }}
    label="Work email"
    type="email"
    value="maya.chen@meridian"
    error="Enter a complete email address."
  />
);

export const DisabledState = () => (
  <Field
    style={{ maxWidth: 340 }}
    label="Plan year"
    value="2026"
    disabled
  />
);
