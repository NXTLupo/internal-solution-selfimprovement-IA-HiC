import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
} from 'nxt-proto-ds';

// Radix portal component: rendered with open so the panel mounts statically.
export const FilterPanel = () => (
  <Sheet open modal={false}>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>Filter the source library</SheetTitle>
        <SheetDescription>
          Narrow the corpus by source type, recency, and county before the next benchmark run.
        </SheetDescription>
      </SheetHeader>
      <Separator style={{ marginTop: 16, marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="text-micro text-ink">Academic and government sources</span>
        <span className="text-micro text-ink">News and trade press</span>
        <span className="text-micro text-ink">Social and community threads</span>
      </div>
      <div style={{ marginTop: 20 }}>
        <Button size="sm">Apply filters</Button>
      </div>
    </SheetContent>
  </Sheet>
);

export const RecordDetail = () => (
  <Sheet open modal={false}>
    <SheetContent side="left">
      <SheetHeader>
        <SheetTitle>Cass County parcel 14</SheetTitle>
        <SheetDescription>
          Eastern parcels carry the elevated flood exposure this season; drought outlook stays
          neutral for irrigated acreage.
        </SheetDescription>
      </SheetHeader>
    </SheetContent>
  </Sheet>
);
