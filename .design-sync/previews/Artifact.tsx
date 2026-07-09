import * as React from 'react';
import { Artifact } from 'nxt-proto-ds';

export const RenderedCanvas = () => (
  <Artifact
    message="The churn brief is ready. It leads with the onboarding-friction finding and cites the retention interviews first."
    fileName="churn-brief.html"
    version="v3"
    style={{ maxWidth: 640 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>Enterprise churn brief</span>
      <span style={{ fontSize: 12 }}>
        Accounts that skip data import cancel at the highest rate. Setup-confusion
        tickets lead cancellations by a quarter.
      </span>
    </div>
  </Artifact>
);

export const GeneratingSkeleton = () => (
  <Artifact
    message="Drafting the cohort comparison now; the canvas fills in as sections complete."
    fileName="cohort-comparison.html"
    version="v1"
    style={{ maxWidth: 640 }}
  />
);
