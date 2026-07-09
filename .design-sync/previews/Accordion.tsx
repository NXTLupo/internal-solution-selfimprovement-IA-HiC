import * as React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'nxt-proto-ds';

export const MethodologyFaq = () => (
  <Accordion type="single" collapsible defaultValue="coverage" style={{ maxWidth: 420 }}>
    <AccordionItem value="coverage">
      <AccordionTrigger>How is county-level flood exposure scored?</AccordionTrigger>
      <AccordionContent>
        Exposure blends FEMA flood-zone maps with ten seasons of claims history for the county,
        weighted toward the most recent three seasons.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="benchmarks">
      <AccordionTrigger>Where do the plan benchmarks come from?</AccordionTrigger>
      <AccordionContent>
        Benchmarks aggregate anonymized enrollment files from participating employers, refreshed
        each quarter.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="privacy">
      <AccordionTrigger>Is my enrollment file shared with carriers?</AccordionTrigger>
      <AccordionContent>
        No. Your file stays inside the workbench; only aggregate benchmarks leave the tenant.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const MultipleOpen = () => (
  <Accordion type="multiple" defaultValue={['drought', 'inputs']} style={{ maxWidth: 420 }}>
    <AccordionItem value="drought">
      <AccordionTrigger>Drought outlook, plains region</AccordionTrigger>
      <AccordionContent>
        Irrigated acreage stays neutral through August; dryland corn carries the elevated risk.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="inputs">
      <AccordionTrigger>Input cost projections</AccordionTrigger>
      <AccordionContent>
        Fertilizer and diesel remain the two largest margin drivers for row crops this season.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
