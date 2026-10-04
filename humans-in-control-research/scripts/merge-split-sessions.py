#!/usr/bin/env python
"""Merge engagements that were filed under two slugs (plan Stage 0.1, owner decision 7).

Until 2026-10-01 the SPA derived a 60-character engagement slug for artifacts, traces,
AIR records and wiki/engagements pages while the proxy derived an 80-character slug for
chat and session state, so one engagement lived in two folders. The canonical slug is now
the 80-character form everywhere (services/engagementSlug.ts == proxy _safe_session_slug).

This script, run once, moves each short-named folder's contents into its full-named twin
and leaves a MERGED_INTO.txt pointer behind. Pairing rule: the short name is a prefix of
the full name and both exist. Nothing is deleted; collisions are reported, not overwritten.

Usage:  python scripts/merge-split-sessions.py [--apply]   (dry run without --apply)
"""
import os, sys, shutil, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WS = os.path.join(ROOT, "hic-workspace")
SESSIONS = os.path.join(WS, "sessions")
ENGAGEMENTS = os.path.join(WS, "wiki", "engagements")
APPLY = "--apply" in sys.argv


def pairs(base):
    names = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)) and not d.startswith("_")]
    out = []
    for short in names:
        if len(short) >= 80:
            continue
        twins = [n for n in names if n != short and n.startswith(short) and len(n) > len(short)]
        if len(twins) == 1:
            out.append((short, twins[0]))
    return out


def merge_dir(src, dst, log):
    for name in os.listdir(src):
        if name == "MERGED_INTO.txt":
            continue
        s = os.path.join(src, name)
        d = os.path.join(dst, name)
        if os.path.isdir(s):
            os.makedirs(d, exist_ok=True)
            merge_dir(s, d, log)
            if APPLY and not os.listdir(s):
                os.rmdir(s)
        else:
            if os.path.exists(d):
                log.append(f"  COLLISION kept both: {os.path.relpath(d, WS)} (short copy left in place)")
                continue
            log.append(f"  move {os.path.relpath(s, WS)} -> {os.path.relpath(d, WS)}")
            if APPLY:
                shutil.move(s, d)


def main():
    log = []
    session_pairs = pairs(SESSIONS)
    log.append(f"sessions: {len(session_pairs)} split engagement(s)")
    for short, full in session_pairs:
        log.append(f"- {short}  ->  {full}")
        merge_dir(os.path.join(SESSIONS, short), os.path.join(SESSIONS, full), log)
        if APPLY:
            with open(os.path.join(SESSIONS, short, "MERGED_INTO.txt"), "w", encoding="utf-8") as f:
                f.write(f"{full}\nmerged {datetime.datetime.utcnow().isoformat()}Z by scripts/merge-split-sessions.py (plan Stage 0.1)\n")
    # wiki/engagements: the short-named folder becomes the full-named one when a session twin exists
    full_sessions = [d for d in os.listdir(SESSIONS) if os.path.isdir(os.path.join(SESSIONS, d)) and len(d) >= 70]
    eng_moves = 0
    if os.path.isdir(ENGAGEMENTS):
        for short in os.listdir(ENGAGEMENTS):
            sp = os.path.join(ENGAGEMENTS, short)
            if not os.path.isdir(sp) or len(short) >= 80:
                continue
            twins = [n for n in full_sessions if n.startswith(short) and len(n) > len(short)]
            if len(twins) != 1:
                continue
            full = twins[0]
            dst = os.path.join(ENGAGEMENTS, full)
            log.append(f"- wiki/engagements/{short} -> {full}")
            if os.path.exists(dst):
                merge_dir(sp, dst, log)
            else:
                log.append(f"  rename wiki/engagements/{short} -> wiki/engagements/{full}")
                if APPLY:
                    shutil.move(sp, dst)
                    os.makedirs(sp, exist_ok=True)
            if APPLY:
                with open(os.path.join(sp, "MERGED_INTO.txt"), "w", encoding="utf-8") as f:
                    f.write(f"{full}\n")
            eng_moves += 1
    log.append(f"wiki/engagements: {eng_moves} folder(s) renamed/merged")
    print("\n".join(log))
    print("\nMODE:", "APPLIED" if APPLY else "DRY RUN (pass --apply to execute)")


if __name__ == "__main__":
    main()
