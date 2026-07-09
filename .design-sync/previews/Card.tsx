import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from 'nxt-proto-ds';

export const ResearchSummary = () => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <CardTitle>Quarterly plan review</CardTitle>
      <CardDescription>Benchmarks against similar-size employers in your industry.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-micro text-ink leading-relaxed">
        High-deductible enrollment held flat while dependent coverage grew. The plan mix now sits
        close to the industry median for manufacturing employers.
      </p>
    </CardContent>
    <CardFooter>
      <Button size="sm">Open full report</Button>
      <Button size="sm" variant="ghost">
        Share
      </Button>
    </CardFooter>
  </Card>
);

export const WithStatus = () => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardTitle>Field risk assessment</CardTitle>
        <Badge variant="success">Current</Badge>
      </div>
      <CardDescription>Cass County, row crops, 2026 season.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-micro text-ink leading-relaxed">
        Flood exposure rose on the eastern parcels; input costs remain the larger driver of margin
        risk for this operation.
      </p>
    </CardContent>
  </Card>
);

export const Minimal = () => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <CardTitle>Advisory note</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-micro text-muted-foreground">
        Renewal decisions lock on March 31; unresolved dependent verifications carry into the next
        cycle.
      </p>
    </CardContent>
  </Card>
);
