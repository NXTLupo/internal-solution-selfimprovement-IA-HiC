import * as React from 'react';
import { Sidebar } from 'nxt-proto-ds';

type IconProps = { className?: string; strokeWidth?: number | string };

const svg = (path: React.ReactNode) => ({ className, strokeWidth = 1.8 }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {path}
  </svg>
);

const SearchIcon = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
const FolderIcon = svg(<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />);
const FileIcon = svg(<><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /></>);
const GearIcon = svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>);

export const IconRail = () => (
  <Sidebar
    heading="Workspace"
    items={[
      { label: 'Research runs', icon: SearchIcon, active: true },
      { label: 'Source library', icon: FolderIcon },
      { label: 'Briefs', icon: FileIcon },
      { label: 'Settings', icon: GearIcon },
    ]}
  />
);

export const PlainLabels = () => (
  <Sidebar
    items={[
      { label: 'Churn drivers' },
      { label: 'Onboarding funnel', active: true },
      { label: 'Pricing cohorts' },
      { label: 'Citation audit' },
    ]}
  />
);
