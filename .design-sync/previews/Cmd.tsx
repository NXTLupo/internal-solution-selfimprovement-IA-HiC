import * as React from 'react';
import { Cmd } from 'nxt-proto-ds';

export const Palette = () => (
  <Cmd
    style={{ width: 360 }}
    groups={[
      {
        heading: 'Navigation',
        commands: [
          { label: 'Open claims board', shortcut: 'Ctrl B' },
          { label: 'Go to risk reports', shortcut: 'Ctrl R' },
          { label: 'Search policies', shortcut: 'Ctrl P' },
        ],
      },
      {
        heading: 'Actions',
        commands: [
          { label: 'File a new claim', shortcut: 'Ctrl N' },
          { label: 'Export county report' },
          { label: 'Invite a teammate' },
        ],
      },
    ]}
  />
);

export const CustomPlaceholder = () => (
  <Cmd
    placeholder="Search plans and claims..."
    style={{ width: 360 }}
    groups={[
      {
        heading: 'Recent',
        commands: [
          { label: 'Drought exposure, Dawson County' },
          { label: 'Enrollment file, March upload' },
        ],
      },
      {
        heading: 'Reports',
        commands: [
          { label: 'Claims by category, Q1', shortcut: 'Ctrl 1' },
          { label: 'Plan benchmark summary', shortcut: 'Ctrl 2' },
        ],
      },
    ]}
  />
);
