import * as React from 'react';
import { BottomNav } from 'nxt-proto-ds';

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

const HomeIcon = svg(<><path d="m3 10.5 9-7.5 9 7.5" /><path d="M5 9.5V21h14V9.5" /></>);
const ChatIcon = svg(<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />);
const BookIcon = svg(<><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z" /><path d="M4 17a3 3 0 0 1 3-3h11" /></>);
const UserIcon = svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);

export const FourTabs = () => (
  <BottomNav
    style={{ width: 400 }}
    items={[
      { label: 'Home', icon: HomeIcon },
      { label: 'Ask', icon: ChatIcon, active: true },
      { label: 'Library', icon: BookIcon },
      { label: 'Profile', icon: UserIcon },
    ]}
  />
);

export const ThreeTabs = () => (
  <BottomNav
    style={{ width: 400 }}
    items={[
      { label: 'Home', icon: HomeIcon, active: true },
      { label: 'Ask', icon: ChatIcon },
      { label: 'Library', icon: BookIcon },
    ]}
  />
);
