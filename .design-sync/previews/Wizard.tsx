import * as React from 'react';
import { Wizard, Field, CheckGroup } from 'nxt-proto-ds';

export const MidFlow = () => (
  <Wizard
    style={{ maxWidth: 440 }}
    steps={['Objective', 'Sources', 'Review']}
    current={1}
  >
    <CheckGroup
      legend="Include source types"
      options={[
        { value: 'academic', label: 'Academic journals', checked: true },
        { value: 'news', label: 'Industry news', checked: true },
        { value: 'social', label: 'Social listening' },
      ]}
    />
  </Wizard>
);

export const FirstStep = () => (
  <Wizard
    style={{ maxWidth: 440 }}
    steps={['Objective', 'Sources', 'Review']}
    current={0}
  >
    <Field label="Research objective" placeholder="Why do enrollees skip preventive care?" />
  </Wizard>
);

export const LastStepBlocked = () => (
  <Wizard
    style={{ maxWidth: 440 }}
    steps={['Objective', 'Sources', 'Review']}
    current={2}
    nextLabel="Finish"
    nextDisabled
  >
    <Field
      label="Engagement name"
      value=""
      error="Name the engagement before finishing."
    />
  </Wizard>
);
