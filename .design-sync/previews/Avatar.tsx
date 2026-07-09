import * as React from 'react';
import { Avatar, AvatarFallback } from 'nxt-proto-ds';

export const Initials = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Avatar>
      <AvatarFallback>MR</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>JL</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>AK</AvatarFallback>
    </Avatar>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Avatar style={{ height: 28, width: 28 }}>
      <AvatarFallback>SM</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>MD</AvatarFallback>
    </Avatar>
    <Avatar style={{ height: 48, width: 48 }}>
      <AvatarFallback>LG</AvatarFallback>
    </Avatar>
  </div>
);

export const WithName = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 320 }}>
    <Avatar>
      <AvatarFallback>DH</AvatarFallback>
    </Avatar>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span className="text-micro font-title font-semibold text-ink">Dana Herrera</span>
      <span className="text-nano text-grey">Benefits analyst, plan design</span>
    </div>
  </div>
);
