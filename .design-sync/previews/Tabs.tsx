import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'nxt-proto-ds';

export const ReportSections = () => (
  <Tabs defaultValue="findings" style={{ maxWidth: 420 }}>
    <TabsList>
      <TabsTrigger value="findings">Findings</TabsTrigger>
      <TabsTrigger value="evidence">Evidence</TabsTrigger>
      <TabsTrigger value="actions">Actions</TabsTrigger>
    </TabsList>
    <TabsContent value="findings">
      <p className="text-micro text-ink leading-relaxed">
        Dependent coverage grew while high-deductible enrollment held flat, moving the plan mix
        toward the industry median.
      </p>
    </TabsContent>
    <TabsContent value="evidence">
      <p className="text-micro text-ink">Verbatim quotes and named sources appear here.</p>
    </TabsContent>
    <TabsContent value="actions">
      <p className="text-micro text-ink">Recommended plan changes appear here.</p>
    </TabsContent>
  </Tabs>
);

export const RiskViews = () => (
  <Tabs defaultValue="flood" style={{ maxWidth: 420 }}>
    <TabsList>
      <TabsTrigger value="flood">Flood</TabsTrigger>
      <TabsTrigger value="drought">Drought</TabsTrigger>
      <TabsTrigger value="inputs">Input costs</TabsTrigger>
      <TabsTrigger value="hail" disabled>
        Hail
      </TabsTrigger>
    </TabsList>
    <TabsContent value="flood">
      <p className="text-micro text-ink leading-relaxed">
        Eastern parcels carry the elevated exposure; the western half of the county stays inside
        the historical band.
      </p>
    </TabsContent>
    <TabsContent value="drought">
      <p className="text-micro text-ink">Outlook stays neutral for irrigated acreage.</p>
    </TabsContent>
    <TabsContent value="inputs">
      <p className="text-micro text-ink">Fertilizer and diesel remain the largest margin drivers.</p>
    </TabsContent>
  </Tabs>
);
