"""Offline tests for the Teams channel: token verification with a local key pair, one conversation per
Teams user, replies routed back to the right conversation, and the bridge off without credentials."""
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import channels, config, store, teams  # noqa: E402

jwt = pytest.importorskip("jwt")
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setenv("MICROSOFT_APP_ID", "app-123")
    monkeypatch.setenv("MICROSOFT_APP_PASSWORD", "secret")
    yield


def _keys():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(priv.public_key()))
    jwk["kid"] = "k1"
    return priv, {"keys": [jwk]}


def _token(priv, **over):
    claims = {"iss": teams.ISSUER, "aud": "app-123", "exp": int(time.time()) + 600, **over}
    return "Bearer " + jwt.encode(claims, priv, algorithm="RS256", headers={"kid": "k1"})


def test_valid_token_passes_and_wrong_audience_or_issuer_fails():
    priv, jwks = _keys()
    assert teams.verify_token(_token(priv), jwks)["aud"] == "app-123"
    with pytest.raises(Exception):
        teams.verify_token(_token(priv, aud="someone-else"), jwks)
    with pytest.raises(Exception):
        teams.verify_token(_token(priv, iss="https://evil.example"), jwks)
    other, _ = _keys()
    with pytest.raises(Exception):
        teams.verify_token(_token(other), jwks)      # signed by a key the Bot Framework did not publish


def test_bridge_is_off_without_credentials(monkeypatch):
    monkeypatch.setenv("MICROSOFT_APP_PASSWORD", "")
    assert not teams.enabled()


def _activity(user, text, aid="a1"):
    return {"type": "message", "id": aid, "text": text, "serviceUrl": "https://smba.trafficmanager.net/amer/",
            "from": {"id": "29:x", "aadObjectId": user}, "recipient": {"id": "28:bot"}, "conversation": {"id": "conv-" + user}}


def test_one_teams_user_one_conversation_and_reply_goes_back_to_them():
    sent, made = [], []
    new = lambda: made.append(1) or f"conv_{len(made)}"
    turn = lambda cid, text: {"reply": f"[{cid}] {text}"}
    post = lambda url, body: sent.append((url, body))
    a = teams.handle(_activity("user-A", "hello"), turn, channels.conversation_for, new, post, background=False)
    b = teams.handle(_activity("user-A", "again", "a2"), turn, channels.conversation_for, new, post, background=False)
    teams.handle(_activity("user-B", "hi", "a3"), turn, channels.conversation_for, new, post, background=False)
    assert a["conversation_id"] == b["conversation_id"] and len(made) == 2
    assert sent[0][0] == "https://smba.trafficmanager.net/amer/v3/conversations/conv-user-A/activities/a1"
    assert sent[1][1]["text"].endswith("again") and sent[2][0].endswith("conv-user-B/activities/a3")


def test_non_message_activities_never_reach_the_agent():
    called = []
    out = teams.handle({"type": "conversationUpdate"}, lambda *a: called.append(a), channels.conversation_for, lambda: "c", background=False)
    assert out == {"ignored": "conversationUpdate"} and not called


def test_service_url_allowlist_protects_the_bot_token():
    for ok in ("https://smba.trafficmanager.net/amer/", "https://europe.webchat.botframework.com/", "https://smba.infra.gcc.teams.microsoft.com/"):
        assert teams.trusted_service_url(ok), ok
    for bad in ("http://smba.trafficmanager.net/amer/", "https://evil.example/", "https://smba.trafficmanager.net.evil.example/",
                "https://evilbotframework.com/", "https://user:pw@smba.trafficmanager.net/", "file:///etc/passwd", "", None):
        assert not teams.trusted_service_url(bad), bad


def test_reply_refuses_an_untrusted_service_url():
    sent = []
    act = _activity("user-A", "hi")
    act["serviceUrl"] = "https://attacker.example/"
    with pytest.raises(ValueError):
        teams.reply(act, "x", post=lambda u, b: sent.append(u))
    assert not sent


def test_token_must_carry_the_activitys_service_url_and_a_teams_endorsed_key():
    priv, jwks = _keys()
    url = "https://smba.trafficmanager.net/amer/"
    assert teams.verify_token(_token(priv, serviceurl=url), jwks, service_url=url)
    with pytest.raises(ValueError):
        teams.verify_token(_token(priv, serviceurl="https://smba.trafficmanager.net/emea/"), jwks, service_url=url)
    jwks["keys"][0]["endorsements"] = ["skype"]
    with pytest.raises(ValueError):
        teams.verify_token(_token(priv, serviceurl=url), jwks, service_url=url)


def test_errors_never_echo_internal_detail_into_the_chat():
    sent = []
    def boom(cid, text):
        raise RuntimeError("connect to research-proxy:5012 failed, token=abc")
    teams.handle(_activity("user-A", "hi"), boom, channels.conversation_for, lambda: "c1", lambda u, b: sent.append(b), background=False)
    assert sent and "5012" not in sent[0]["text"] and "token" not in sent[0]["text"]
