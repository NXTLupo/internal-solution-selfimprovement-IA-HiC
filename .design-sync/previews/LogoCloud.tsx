import * as React from 'react';
import { LogoCloud } from 'nxt-proto-ds';

export const CustomerBand = () => (
  <LogoCloud
    style={{ width: 560 }}
    names={['Fieldstone', 'Meridian Health', 'Bluepine Advisory', 'Corvid Labs', 'Atlas & Rowe']}
  />
);

export const PartnerBand = () => (
  <LogoCloud
    caption="Research partners"
    style={{ width: 560 }}
    names={['Northgate Institute', 'Civic Data Collective', 'Harbor Analytics']}
  />
);
