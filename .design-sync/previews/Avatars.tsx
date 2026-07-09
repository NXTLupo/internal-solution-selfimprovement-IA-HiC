import * as React from 'react';
import { Avatars } from 'nxt-proto-ds';

export const WithOverflow = () => (
  <Avatars
    people={[
      { name: 'Maya Chen' },
      { name: 'Priya Raman' },
      { name: 'Jon Lupo' },
      { name: 'Dana Whitfield' },
      { name: 'Sam Ortiz' },
      { name: 'Lena Park' },
    ]}
    max={4}
  />
);

export const SmallTeam = () => (
  <Avatars
    people={[{ name: 'Maya Chen' }, { name: 'Priya Raman' }]}
    caption="Reviewing now"
  />
);
