import * as React from 'react';
import { Code } from 'nxt-proto-ds';

export const WithFilename = () => (
  <Code
    filename="risk-report.yml"
    language="yaml"
    code={`report:
  county: dawson
  perils: [flood, drought]
  window: 2020-2026
  output: pdf`}
    style={{ width: 420 }}
  />
);

export const BareSnippet = () => (
  <Code
    code={`curl -s https://api.example.com/v1/claims \\
  -H "Authorization: Bearer $TOKEN" | jq '.items[0]'`}
    style={{ width: 420 }}
  />
);
