import * as React from 'react';
import { Skeleton } from 'nxt-proto-ds';

export const TextBlock = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
  </div>
);

export const CardLoading = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 360 }}>
    <Skeleton className="h-10 w-10 rounded-full" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

export const StatTiles = () => (
  <div style={{ display: 'flex', gap: 10, width: 420 }}>
    <Skeleton style={{ height: 80, flex: 1, borderRadius: 8 }} />
    <Skeleton style={{ height: 80, flex: 1, borderRadius: 8 }} />
    <Skeleton style={{ height: 80, flex: 1, borderRadius: 8 }} />
  </div>
);
