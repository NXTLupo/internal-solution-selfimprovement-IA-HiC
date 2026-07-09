import * as React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Button, Badge } from 'nxt-proto-ds';

export const OnButton = () => (
  <TooltipProvider>
    <div style={{ paddingTop: 48, display: 'flex', justifyContent: 'center' }}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">
            Export report
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exports the full benchmark run as PDF</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const OnBadge = () => (
  <TooltipProvider>
    <div style={{ paddingTop: 48, display: 'flex', justifyContent: 'center' }}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <span style={{ display: 'inline-flex' }}>
            <Badge variant="info">External source</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>Indexed from the USDA county participation dataset</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const BelowTrigger = () => (
  <TooltipProvider>
    <div style={{ paddingBottom: 48, display: 'flex', justifyContent: 'center' }}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button size="sm">Start run</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Takes about four minutes for a full corpus</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);
