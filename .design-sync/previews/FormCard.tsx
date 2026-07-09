import * as React from 'react';
import { FormCard } from 'nxt-proto-ds';

export const SignIn = () => (
  <FormCard
    title="Sign in to Workbench"
    fields={[
      { label: 'Work email', type: 'email', placeholder: 'you@company.com' },
      { label: 'Password', type: 'password', placeholder: 'At least 12 characters' },
    ]}
    submitLabel="Sign in"
    secondaryLabel="Continue with SSO"
  />
);

export const IntakeBrief = () => (
  <FormCard
    title="Start a research run"
    fields={[
      { label: 'Engagement name', placeholder: 'Q3 benefits utilization study' },
      { label: 'Research objective', placeholder: 'Why do enrollees skip preventive care?' },
      { label: 'Client industry', placeholder: 'Employer health benefits' },
    ]}
    submitLabel="Create engagement"
  />
);

export const WithError = () => (
  <FormCard
    title="Create your account"
    fields={[
      { label: 'Full name', value: 'Maya Chen' },
      { label: 'Work email', type: 'email', value: 'maya.chen@meridian', error: 'Enter a complete email address.' },
    ]}
    submitLabel="Create account"
  />
);
