import * as React from 'react';
import { cn } from '../lib/utils';

/** Loading placeholder block on the ecru wash. */
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Skeleton({ className, ...props }, ref) {
  return <div ref={ref} className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
});

export { Skeleton };
