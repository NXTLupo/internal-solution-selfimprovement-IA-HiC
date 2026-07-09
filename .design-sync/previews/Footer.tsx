import * as React from 'react';
import { Footer } from 'nxt-proto-ds';

export const FourColumn = () => (
  <Footer
    style={{ maxWidth: 640 }}
    columns={[
      { heading: 'Product', links: [{ label: 'Research runs' }, { label: 'Deliverables' }, { label: 'Source packs' }, { label: 'Pricing' }] },
      { heading: 'Company', links: [{ label: 'About' }, { label: 'Careers' }, { label: 'Press' }] },
      { heading: 'Resources', links: [{ label: 'Docs' }, { label: 'Methodology' }, { label: 'Status' }] },
      { heading: 'Legal', links: [{ label: 'Privacy' }, { label: 'Terms' }, { label: 'Security' }] },
    ]}
    copyright="(c) 2026 Meridian Labs. All rights reserved."
  />
);

export const Compact = () => (
  <Footer
    style={{ maxWidth: 460 }}
    columns={[
      { heading: 'Product', links: [{ label: 'Research runs' }, { label: 'Pricing' }] },
      { heading: 'Support', links: [{ label: 'Docs' }, { label: 'Contact' }] },
    ]}
  />
);
