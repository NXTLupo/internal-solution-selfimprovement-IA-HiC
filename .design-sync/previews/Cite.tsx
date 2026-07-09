import * as React from 'react';
import { Cite } from 'nxt-proto-ds';

export const CitedAnswer = () => (
  <Cite
    style={{ maxWidth: 560 }}
    sources={[
      { host: 'usda.gov', title: 'Crop insurance participation by county, 2025 season' },
      { host: 'noaa.gov', title: 'Seasonal drought outlook, plains region' },
      { host: 'extension.iastate.edu', title: 'Input cost projections for row crops' },
      { host: 'reuters.com', title: 'Reinsurance pricing tightens for agricultural risk' },
    ]}
  >
    County-level flood exposure rose in the eastern plains this season [1], while the drought outlook
    stayed neutral for irrigated acreage [2]. Input costs are the larger driver of margin risk [3],
    and reinsurance pricing is passing through to premiums [4].
  </Cite>
);

export const ResearchLabel = () => (
  <Cite
    roleLabel="Research analyst"
    style={{ maxWidth: 560 }}
    sources={[
      { host: 'kff.org', title: 'Employer health benefits survey, plan mix section' },
      { host: 'bls.gov', title: 'Employment cost index, benefits component' },
    ]}
  >
    High-deductible plan enrollment held flat year over year [1], while employer benefit costs grew
    faster than wages for the third straight quarter [2].
  </Cite>
);
