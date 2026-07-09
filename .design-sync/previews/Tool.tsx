import * as React from 'react';
import { Tool } from 'nxt-proto-ds';

export const Completed = () => (
  <Tool
    name="search_corpus"
    params='{ "query": "churn drivers", "segment": "enterprise" }'
    result="14 passages matched across retention interviews and support-ticket exports."
    status="completed"
    style={{ maxWidth: 480 }}
  />
);

export const Running = () => (
  <Tool
    name="cluster_feedback"
    params='{ "source": "nps_verbatims_q2.csv", "k": 8 }'
    status="running"
    style={{ maxWidth: 480 }}
  />
);

export const Errored = () => (
  <Tool
    name="fetch_crm_accounts"
    params='{ "status": "cancelled", "since": "2025-01-01" }'
    result="CRM connector timed out; retry with a narrower date range."
    status="error"
    style={{ maxWidth: 480 }}
  />
);
