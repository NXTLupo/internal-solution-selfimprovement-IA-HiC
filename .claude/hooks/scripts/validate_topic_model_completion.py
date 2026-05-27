#!/usr/bin/env python3
"""
Topic Model Completion Validator — Stop hook.

Evidence from 2026-05-24 Northeastern run:
  - 127.0.0.1:5012/api/topic-model/status/tm_1779631809_51bc60e9 — 404
  - 127.0.0.1:5012/api/topic-model/status/tm_1779632983_9fe7d3e9 — 404
  - [topic-model] job failed: (empty error message)

Backend created topic-model job IDs that the frontend later couldn't find
when polling status. The "[topic-model] job failed:" log line has no error
detail because the 404 swallowed it. Pipeline shipped without topic-model
output and the user was never told.

This hook scans the deliverable + session log for topic-model job ID
patterns and verifies each has a corresponding success record. Job IDs
appearing in the session WITHOUT a success record indicate the topic
model failed and was swallowed.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json
import re

TOPIC_MODEL_JOB_ID_PATTERN = re.compile(r'\btm_\d{8,12}_[a-f0-9]{6,12}\b')


def find_job_ids(obj):
    """Collect every topic-model job ID mentioned anywhere in the tree."""
    out = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                for m in TOPIC_MODEL_JOB_ID_PATTERN.findall(v):
                    out.add(m)
            elif isinstance(v, (dict, list)):
                out |= find_job_ids(v)
    elif isinstance(obj, list):
        for item in obj:
            out |= find_job_ids(item)
    elif isinstance(obj, str):
        for m in TOPIC_MODEL_JOB_ID_PATTERN.findall(obj):
            out.add(m)
    return out


def find_completed_jobs(obj):
    """Look for topic-model success records — fields like
    topic_model_results, topic_clusters, bertopic_topics, etc."""
    completed = set()
    if isinstance(obj, dict):
        # Direct success fields
        for key in ('topic_model_results', 'topicModelResults',
                    'topic_clusters', 'topicClusters',
                    'bertopic_topics', 'topic_model_status'):
            v = obj.get(key)
            if v:
                if isinstance(v, dict):
                    jid = v.get('job_id') or v.get('jobId')
                    status = v.get('status', '').lower()
                    if jid and status in ('completed', 'success', 'done'):
                        completed.add(jid)
                elif isinstance(v, list) and v:
                    # A non-empty cluster list implies a job did succeed
                    nearest_jid = obj.get('topic_model_job_id') or obj.get('job_id')
                    if nearest_jid:
                        completed.add(nearest_jid)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                completed |= find_completed_jobs(v)
    elif isinstance(obj, list):
        for item in obj:
            completed |= find_completed_jobs(item)
    return completed


def find_failed_jobs(obj):
    """Look for explicit failure records — fields like topic_model_error,
    topic_model_failed: true, etc."""
    failed = set()
    if isinstance(obj, dict):
        for key in ('topic_model_error', 'topicModelError',
                    'topic_model_failures', 'topic_model_status'):
            v = obj.get(key)
            if isinstance(v, dict):
                jid = v.get('job_id') or v.get('jobId')
                status = str(v.get('status', '')).lower()
                if jid and status in ('failed', 'error', 'timeout'):
                    failed.add(jid)
            elif isinstance(v, str) and v.lower() in ('failed', 'error'):
                # Bare status string — look for nearby job ID
                for jid in TOPIC_MODEL_JOB_ID_PATTERN.findall(json.dumps(obj)):
                    failed.add(jid)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                failed |= find_failed_jobs(v)
    elif isinstance(obj, list):
        for item in obj:
            failed |= find_failed_jobs(item)
    return failed


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    job_ids = find_job_ids(data)
    if not job_ids:
        sys.exit(0)

    completed = find_completed_jobs(data)
    failed = find_failed_jobs(data)

    # Orphan jobs: mentioned but neither completed nor explicitly failed
    orphans = job_ids - completed - failed

    if orphans:
        sys.stderr.write("TOPIC MODEL COMPLETION VALIDATION FAILED:\n")
        sys.stderr.write(
            f"  {len(orphans)} topic-model job ID(s) appear in the deliverable / "
            f"session log but have no corresponding success or failure record:\n"
        )
        for jid in sorted(orphans):
            sys.stderr.write(f"    - {jid}\n")
        sys.stderr.write(
            "\nThis pattern matches the 2026-05-24 Northeastern failure: backend "
            "topic-model jobs returned 404 when polled and the '[topic-model] job "
            "failed:' log line had no error detail. Either the topic-model service "
            "in proxy/app.py is dropping jobs between create and poll, OR the "
            "frontend is polling with stale IDs. Investigate proxy/app.py topic-model "
            "job store and the polling logic in the frontend service that called these.\n"
        )
        sys.exit(2)

    if failed:
        sys.stderr.write("TOPIC MODEL EXPLICIT FAILURE:\n")
        for jid in sorted(failed):
            sys.stderr.write(f"  - {jid} marked failed\n")
        sys.stderr.write(
            "\nA topic-model job ran to failure. Surface this in the user-visible "
            "degradation_events[] rather than burying it.\n"
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == '__main__':
    main()
