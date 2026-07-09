import * as React from 'react';
import { Compare } from 'nxt-proto-ds';

export const StackComparison = () => (
  <Compare
    style={{ width: 480 }}
    before={{
      label: 'Current stack',
      items: [
        'Claims triaged by hand from a shared inbox',
        'Risk scores updated once a quarter',
        'Benchmarks bought from a third party',
      ],
    }}
    after={{
      label: 'With the platform',
      items: [
        'Claims routed by peril and severity on arrival',
        'Risk scores refreshed nightly from county data',
        'Benchmarks drawn from your own book of business',
      ],
    }}
  />
);

export const UnevenRows = () => (
  <Compare
    style={{ width: 440 }}
    before={{
      label: 'Before',
      items: ['Enrollment file emailed as a spreadsheet', 'Dependent checks done manually'],
    }}
    after={{
      label: 'After',
      items: [
        'Enrollment synced from the carrier feed',
        'Dependent checks run at upload',
        'Exceptions flagged for review the same day',
      ],
    }}
  />
);
