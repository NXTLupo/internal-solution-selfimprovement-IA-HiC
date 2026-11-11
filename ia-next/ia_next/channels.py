"""Channels: one agent, several surfaces (plan 6.1 and 6.9; OpenClaw's identity links in 3.5).

The web page is the first surface. Any other surface (a Slack or Teams bot, an email bridge, a phone
assistant) reaches the same agent through one signed webhook. The bridge sends the channel name, a
stable `person_key` (the same key on every channel links one person's conversations) and the text,
signed with HMAC-SHA256 over the raw body using IA_NEXT_CHANNEL_SECRET. Without that secret configured
the webhook is off. Everything the agent may do from a channel goes through the same tool layer, so
approvals still wait for the person in the workspace; a channel can never approve on its own.
"""
import hashlib
import hmac
import os
import time

from . import store

SCHEMA = "CREATE TABLE IF NOT EXISTS channel_links (person_key TEXT PRIMARY KEY, conversation_id TEXT, channels TEXT, updated REAL)"


def secret():
    return os.environ.get("IA_NEXT_CHANNEL_SECRET", "")


def verify_signature(raw: bytes, signature: str) -> bool:
    s = secret()
    if not s or not signature:
        return False
    expected = hmac.new(s.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())


def conversation_for(person_key, channel, new_conversation):
    """The one conversation for this person across every channel."""
    c = store.conn()
    c.execute(SCHEMA)
    r = c.execute("SELECT * FROM channel_links WHERE person_key = ?", (person_key,)).fetchone()
    if r:
        chans = set((r["channels"] or "").split(",")) | {channel}
        c.execute("UPDATE channel_links SET channels = ?, updated = ? WHERE person_key = ?", (",".join(sorted(x for x in chans if x)), time.time(), person_key))
        return r["conversation_id"]
    cid = new_conversation()
    c.execute("INSERT INTO channel_links VALUES (?,?,?,?)", (person_key, cid, channel, time.time()))
    return cid
