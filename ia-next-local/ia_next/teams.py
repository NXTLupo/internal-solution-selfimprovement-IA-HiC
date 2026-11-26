"""Microsoft Teams channel (plan 6.1 channels; OpenClaw's identity links in 3.5).

Teams reaches a bot through the Bot Framework: Teams POSTs an Activity to the bot's messaging endpoint
with a signed bearer token, and the bot replies through the Bot Connector API with its own token. This
module is that endpoint for IA Next. It is OFF until MICROSOFT_APP_ID and MICROSOFT_APP_PASSWORD are set
(the Azure Bot registration's app id and client secret); TEAMS_TENANT_ID makes it a single-tenant bot.
The messaging endpoint must be public HTTPS (IA Next itself listens on 127.0.0.1 only), for example
through a dev tunnel pointed at port 9400, registered in the Azure Bot as <tunnel>/api/channels/teams.

Rules: every inbound token is verified (issuer, audience = our app id, signature from the Bot
Framework's published keys) before anything runs; one Teams user maps to one agent conversation through
the same identity links as the webhook; the reply is sent after the turn finishes, so Teams gets an
immediate 200; approvals still wait for the person in the workspace, never in Teams.
"""
import os
import threading
import time

import httpx

OPENID = "https://login.botframework.com/v1/.well-known/openidconfiguration"
ISSUER = "https://api.botframework.com"
_JWKS = {"at": 0.0, "keys": None}


def config():
    return {"app_id": os.environ.get("MICROSOFT_APP_ID", ""), "password": os.environ.get("MICROSOFT_APP_PASSWORD", ""),
            "tenant": os.environ.get("TEAMS_TENANT_ID", "")}


def enabled():
    c = config()
    return bool(c["app_id"] and c["password"])


def _jwks():
    if _JWKS["keys"] is None or time.time() - _JWKS["at"] > 86400:
        meta = httpx.get(OPENID, timeout=15).json()
        _JWKS["keys"] = httpx.get(meta["jwks_uri"], timeout=15).json()
        _JWKS["at"] = time.time()
    return _JWKS["keys"]


TRUSTED_EXACT_HOSTS = {"smba.trafficmanager.net"}
TRUSTED_HOST_SUFFIXES = (".botframework.com", ".teams.microsoft.com")   # the latter covers government Teams clouds


def trusted_service_url(url):
    """The bot sends its own bearer token to the activity's serviceUrl, so that URL must be HTTPS on a
    Microsoft Bot Framework host; anything else could receive the token."""
    from urllib.parse import urlparse
    try:
        u = urlparse(url or "")
    except ValueError:
        return False
    host = (u.hostname or "").lower()
    if u.scheme != "https" or not host or u.username or u.password:
        return False
    return host in TRUSTED_EXACT_HOSTS or host.endswith(TRUSTED_HOST_SUFFIXES)


def verify_token(auth_header, jwks=None, service_url=None):
    """Returns the token claims, or raises ValueError. Follows the Bot Framework connector auth rules:
    RS256 only; a signing key the Bot Framework published, endorsed for the msteams channel; issuer and
    audience exact; expiry required; and the token's serviceurl claim must equal the activity's serviceUrl.
    `jwks` is a test seam."""
    import jwt
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise ValueError("no bearer token")
    token = auth_header.split(" ", 1)[1].strip()
    keys = jwks or _jwks()
    header = jwt.get_unverified_header(token)
    if header.get("alg") != "RS256":
        raise ValueError("unexpected algorithm")
    match = [k for k in keys.get("keys", []) if k.get("kid") == header.get("kid")]
    if not match:
        raise ValueError("unknown signing key")
    endorsements = match[0].get("endorsements")
    if endorsements is not None and "msteams" not in endorsements:
        raise ValueError("signing key not endorsed for Teams")
    key = jwt.algorithms.RSAAlgorithm.from_jwk(match[0])
    claims = jwt.decode(token, key=key, algorithms=["RS256"], audience=config()["app_id"], issuer=ISSUER,
                        options={"require": ["exp", "iss", "aud"]}, leeway=300)
    if service_url is not None and claims.get("serviceurl") != service_url:
        raise ValueError("token serviceurl does not match the activity")
    return claims


def bot_token():
    c = config()
    authority = c["tenant"] or "botframework.com"
    r = httpx.post(f"https://login.microsoftonline.com/{authority}/oauth2/v2.0/token", timeout=20,
                   data={"grant_type": "client_credentials", "client_id": c["app_id"], "client_secret": c["password"],
                         "scope": "https://api.botframework.com/.default"})
    r.raise_for_status()
    return r.json()["access_token"]


def reply(activity, text, post=None):
    """Send `text` back into the Teams conversation the activity came from. `post` is a test seam."""
    if not trusted_service_url(activity.get("serviceUrl")):
        raise ValueError("refusing to send the bot token to an untrusted serviceUrl")
    from urllib.parse import quote
    url = (f"{activity['serviceUrl'].rstrip('/')}/v3/conversations/{quote(str(activity['conversation']['id']), safe='')}"
           f"/activities/{quote(str(activity['id']), safe='')}")
    body = {"type": "message", "text": text, "replyToId": activity["id"],
            "from": activity.get("recipient"), "recipient": activity.get("from"), "conversation": activity.get("conversation")}
    if post:
        return post(url, body)
    return httpx.post(url, json=body, headers={"Authorization": f"Bearer {bot_token()}"}, timeout=30).status_code


def person_key(activity):
    f = activity.get("from") or {}
    return "teams:" + (f.get("aadObjectId") or f.get("id") or "unknown")


def handle(activity, turn, conversation_for, new_conversation, post=None, background=True):
    """Process one verified Activity. Only message activities reach the agent."""
    if activity.get("type") != "message" or not (activity.get("text") or "").strip():
        return {"ignored": activity.get("type")}
    text = activity["text"].strip()
    cid = conversation_for(person_key(activity), "teams", new_conversation)

    def work():
        try:
            out = turn(cid, text)
            reply(activity, out["reply"], post)
        except Exception:
            # Never echo internal error text (hosts, stack details) into a chat; the event log has the detail.
            try:
                from . import store
                store.event("teams_error", {"conversation": cid})
                reply(activity, "I could not finish that. The details are in the IA Next workspace.", post)
            except Exception:
                pass

    if background:
        threading.Thread(target=work, daemon=True).start()
    else:
        work()
    return {"accepted": True, "conversation_id": cid}
