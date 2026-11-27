"""The browser reader's four slots are held by the client (26 Nov): eight callers queued inside the reader and the
60-second timeout ran out while they waited ("the browser reader did not answer", 29 papercuts). A paywall (402) is not
sent to the browser."""
import threading
import time

from ia_next import pagetext


def test_no_more_than_four_renderings_are_in_flight(monkeypatch):
    mod = pagetext
    monkeypatch.setattr(mod, "READER_URL", "http://reader")
    live, peak, lock = [0], [0], threading.Lock()

    class R:
        status_code = 200

        def json(self):
            return {"ok": True}

    def post(url, json=None, timeout=None):
        with lock:
            live[0] += 1
            peak[0] = max(peak[0], live[0])
        time.sleep(0.05)
        with lock:
            live[0] -= 1
        return R()
    monkeypatch.setattr(mod.httpx, "post", post)
    ts = [threading.Thread(target=mod._browse_impl, args=(f"https://x/{i}",)) for i in range(10)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert peak[0] == mod.READER_SLOTS == 4


def test_a_paywall_is_not_sent_to_the_browser(monkeypatch):
    monkeypatch.setattr(pagetext, "READER_URL", "http://reader")
    assert pagetext.wants_browser({"ok": False, "status": 402, "reason": "the site answered 402"}) is False
    assert pagetext.wants_browser({"ok": False, "status": 403, "reason": "the site answered 403"}) is True
