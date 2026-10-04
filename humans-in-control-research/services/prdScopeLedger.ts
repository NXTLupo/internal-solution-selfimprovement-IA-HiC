/**
 * prdScopeLedger: the #prd entry point to the SHARED engagement ledger (services/engagementLedger.ts).
 *
 * The ledger (every client document read in full, STATED / FEEDBACK / THEME roots, derived feature areas,
 * per-engagement persistence) is shared by every deliverable; this module only re-exports it under the name the
 * #prd path and the ingestion hook import (`analyzeUploadedDocuments`, `loadEngagementLedger`, `buildScopeLedger`).
 */
export * from './engagementLedger';
