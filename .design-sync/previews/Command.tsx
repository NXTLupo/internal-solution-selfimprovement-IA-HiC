import * as React from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandEmpty,
} from 'nxt-proto-ds';

export const Palette = () => (
  <Command style={{ maxWidth: 420 }}>
    <CommandInput placeholder="Search reports, counties, plans..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Reports">
        <CommandItem>
          Quarterly plan review
          <CommandShortcut>R Q</CommandShortcut>
        </CommandItem>
        <CommandItem>Farm risk summary, Cass County</CommandItem>
        <CommandItem>Enrollment file audit</CommandItem>
      </CommandGroup>
      <CommandGroup heading="Actions">
        <CommandItem>
          New benchmark run
          <CommandShortcut>N B</CommandShortcut>
        </CommandItem>
        <CommandItem>Export to PDF</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

export const CompactList = () => (
  <Command style={{ maxWidth: 360 }}>
    <CommandInput placeholder="Jump to county..." />
    <CommandList>
      <CommandGroup heading="Recent">
        <CommandItem>Cass County, ND</CommandItem>
        <CommandItem>Story County, IA</CommandItem>
        <CommandItem>Saline County, KS</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);
