---
name: hic-run
description: "Start a HiC deliverable from outside HiC and get the report back: a signed call to the proxy's inbound webhook queues an allow-listed job and POSTs the result to a callback. Use when another agent platform, or a Codex session without the proxy token, delegates a deliverable."
invocation: model
version: "1.0"
status: active
surfaces:
  - Codex
---

# hic-run

## Scope

The agent-to-agent half of the coordinator (agent-stack plan WS-D D3, 2026-10-31). Another platform asks HiC
for one bounded deliverable, HiC runs it through its own routing, grounding and gates, and the finished
artifact's id, launcher URL and verdict come back to the caller. Nobody opens the SPA.

Inside the workbench, prefer `research-mcp` `run_deliverable` (it carries the proxy token and accepts the same
`callback_url`). This skill is for callers that hold a webhook secret instead of the proxy token.

## Preconditions

1. The owner has created a secret for the calling source: `python humans-in-control-research/scripts/webhook-secret.py create <source>`.
   Until one exists the endpoint answers 404 (no secret, no endpoint). Never paste a secret into chat, a commit
   or a ticket; hand it over out of band.
2. The corpus is real evidence text (articles, transcripts, uploads), at least a few hundred characters. The
   artifact engine refuses to invent evidence; a thin corpus produces a narrow artifact or a degraded verdict.

## The call

`POST <proxy>/api/webhooks/run` with three headers and a JSON body:

- `X-HiC-Source`: the source name the secret was created for
- `X-HiC-Timestamp`: Unix seconds; requests older than five minutes are refused
- `X-HiC-Signature`: `sha256=` plus the hex HMAC-SHA256 of `<timestamp>.<raw body>` keyed by the source's secret
- body: `{"op": "/api/artifact/generate", "body": {"kind", "goal", "corpus", "brand"}, "callback_url": "..."}`

`op` is limited to the proxy's job allow-list (artifact generate and revise, journey-map generate). A replayed
signature gets 409; a bad or missing signature gets 401; a disallowed op or an unsafe callback gets 400.

The client script does the signing: `HIC_WEBHOOK_SOURCE=<source> HIC_WEBHOOK_SECRET=<secret> python
humans-in-control-research/scripts/hic-run.py --kind recommendation --goal "..." --corpus-file corpus.txt
--callback-url https://...`

## The callback

When the job ends the proxy POSTs `{job_id, op, status, artifact_id, launcher_url, verdict, error, finished_at}`
to `callback_url`, signed with the same scheme (`X-HiC-Source: hic`), so the receiver verifies it came from HiC.
The callback host must be public, or an internal host the owner listed in `HIC_WEBHOOK_CALLBACK_HOSTS`;
loopback and private addresses are refused so the webhook cannot reach into the Docker network.

## Reporting

Report the artifact id and launcher URL exactly as returned, and the verdict fields as given. A failed job is
reported with its error; never describe an artifact you have not received.
