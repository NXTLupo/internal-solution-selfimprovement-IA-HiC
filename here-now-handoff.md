# NXT Humans AI CX Workbench — here.now Remote Deployment Handoff

**Audience:** an AI coding agent (Claude Code, Cursor, etc.) running on a Windows PC laptop.
**Goal:** stand up the Intelligence Augmentation suite on the PC, expose Launchpad via a Cloudflare Tunnel, and front it with a password-gated landing page on here.now.
**End state for the user:** one `{slug}.here.now` URL + one password that trusted reviewers can use to reach the live Launchpad.

---

## 0. Hard rules — read first

These are non-negotiable. The user has reinforced each of these multiple times.

1. **No git activity.** Do not run `git commit`, `git push`, `git tag`, `git filter-repo`, or anything else that creates a git footprint, locally or remote. Local working-tree edits are fine.
2. **Never modify `main`.** Work only on the `HiC-VS-HTML-Hashtag-UX` branch (or a local-only branch off it). `main` must remain untouched.
3. **Scrub before publish.** The repo has ~30 files with literal `sk-ant-...` and `sk-proj-...` API keys in the working tree, plus a `.env` file with 6 live secrets. Nothing with a literal secret ever leaves the local disk.
4. **Confirm the user is OK with each external-account dependency** (here.now, Cloudflare) before signing them up.

---

## 1. Prerequisites

Verify each. If missing, ask the user to install before continuing.

| Tool | Check command | Install (Windows) |
|---|---|---|
| Docker Desktop | `docker --version` | https://www.docker.com/products/docker-desktop/ (must be running, WSL2 backend enabled) |
| WSL2 + Ubuntu | `wsl --status` | `wsl --install -d Ubuntu` (run in elevated PowerShell) |
| Git | `git --version` | `winget install Git.Git` |
| Node.js ≥ 18 | `node --version` | `winget install OpenJS.NodeJS.LTS` |
| cloudflared | `cloudflared --version` | `winget install Cloudflare.cloudflared` |
| curl + jq | `curl --version && jq --version` | Available in WSL Ubuntu by default; `winget install jqlang.jq` for Windows-native |

**Run all subsequent shell commands inside WSL2 Ubuntu** — the repo's `launch.sh` is bash, the bulk-scrub uses POSIX tools, and Docker Desktop transparently bridges WSL → Windows.

---

## 2. Get the code (read-only branch checkout)

```bash
cd ~
gh auth status || gh auth login   # GitHub CLI; user may need to authenticate once
git clone https://github.com/NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH.git workbench
cd workbench
git fetch origin HiC-VS-HTML-Hashtag-UX
git checkout -b HiC-VS-HTML-Hashtag-UX origin/HiC-VS-HTML-Hashtag-UX
```

**Verification:** `git status` shows clean tree, `git branch --show-current` returns `HiC-VS-HTML-Hashtag-UX`.

---

## 3. Bulk-scrub literal API keys from the working tree

The branch tip has literal `sk-ant-...` and `sk-proj-...` keys in ~30 files (nxt-compose.yml, internal-solutions-*, docker/compose-variants/, backup-scripts/, etc.). Replace each with a `${VAR}` placeholder. The `.env` file is intentionally *not* matched by this scan because of its single-line `KEY=value` shape — verify after.

```bash
echo "=== BEFORE ==="
grep -rlE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.history \
  "sk-(ant-api03|proj)-[A-Za-z0-9_-]{20,}" . 2>/dev/null | wc -l

grep -rlE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.history \
  "sk-(ant-api03|proj)-[A-Za-z0-9_-]{20,}" . 2>/dev/null \
  | xargs perl -pi -e 's/sk-ant-api03-[A-Za-z0-9_-]+/\$\{ANTHROPIC_API_KEY\}/g; s/sk-proj-[A-Za-z0-9_-]+/\$\{OPENAI_API_KEY\}/g'

echo "=== AFTER ==="
grep -rlE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.history \
  "sk-(ant-api03|proj)-[A-Za-z0-9_-]{20,}" . 2>/dev/null | wc -l
```

**Pass criteria:** AFTER count is `0`.

**Do not `git add` or `git commit` the changes.** They live in the working tree only. The next `git pull` would re-introduce the literals; that is acceptable and expected.

---

## 4. Configure `.env`

The repo's `.env` is gitignored and must be populated by hand. Ask the user to paste the values for the keys below. Do not log them, do not echo them back, write directly to the file.

```bash
cat > .env <<'EOF'
ANTHROPIC_API_KEY=__USER_PROVIDES__
OPENAI_API_KEY=__USER_PROVIDES__
REPLICATE_API_TOKEN=__USER_PROVIDES__
GEMINI_API_KEY=__USER_PROVIDES__
USE_WHISPER_API=true
MIRO=__USER_PROVIDES__
AZURE_TENANT_ID=__USER_PROVIDES__
AZURE_CLIENT_ID=__USER_PROVIDES__
AZURE_CLIENT_SECRET=__USER_PROVIDES__
AZURE_APP_ID_URI=__USER_PROVIDES__
EOF
chmod 600 .env
```

Then have the user replace each `__USER_PROVIDES__` (most can be no-ops if they're not using that service — `launch.sh` only validates `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`).

Also create the per-service .env:

```bash
mkdir -p internal-solutions-video-analyzer
grep -E "^OPENAI_API_KEY=|^USE_WHISPER_API=" .env > internal-solutions-video-analyzer/.env
chmod 600 internal-solutions-video-analyzer/.env
```

---

## 5. Launch the Docker stack

```bash
chmod +x launch.sh
./launch.sh
```

`launch.sh` will:
- Validate `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` in `.env`
- Kill conflicting host processes on the suite's ports
- Regenerate `docker-compose-all.override.yml` (it inlines the live keys — this file stays local-only)
- Generate self-signed SSL certs in `ssl-certs/`
- `docker compose up -d` the full stack

**Verification:**
```bash
curl -sf http://localhost:8000/health && echo " ✓ Launchpad"
curl -sf http://localhost:8500/health && echo " ✓ Agent"
docker compose -f docker-compose-all.yml ps
```

All services should be `running` or `healthy`. If a service is restarting, `docker compose -f docker-compose-all.yml logs <service>` will show why.

---

## 6. Start the Cloudflare Tunnel

In a separate terminal (keep it open for the session):

```bash
cloudflared tunnel --url http://localhost:8000
```

Cloudflare prints a public URL of the form:
```
https://random-words-1234.trycloudflare.com
```

**Capture this URL** — you'll embed it in the here.now landing page in step 9. The URL changes on every tunnel restart unless the user upgrades to a Cloudflare account + custom domain. For a "trusted reviewers, short window" use case, ephemeral is fine.

**Smoke test from the tunnel:**
```bash
curl -sf https://<that-url>.trycloudflare.com/health && echo " ✓ Launchpad reachable via tunnel"
```

If health passes, WebSocket will also work — cloudflared supports WS upgrades natively.

---

## 7. Install the here.now skill

```bash
npx -y skills add heredotnow/skill --skill here-now -g
```

This installs to `~/.agents/skills/here-now`. Snyk currently flags this as "High Risk" — it's worth glancing at `~/.agents/skills/here-now/scripts/publish.sh` to confirm it does what the SKILL.md describes (HTTP calls to `https://here.now/api/v1/publish/*`, nothing more).

---

## 8. Authenticate to here.now (one-time, for permanent Sites)

Anonymous Sites expire after 24 hours. To get a permanent Site you need an API key.

Ask the user for their email, then:

```bash
EMAIL="user@example.com"  # user provides
curl -sS https://here.now/api/auth/agent/request-code \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
```

Tell the user: "Check your inbox for the here.now sign-in code." When they provide the code:

```bash
CODE="ABCD-2345"  # user provides
RESP=$(curl -sS https://here.now/api/auth/agent/verify-code \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}")
echo "$RESP" | jq .
API_KEY=$(echo "$RESP" | jq -r .apiKey)

# Save it — do NOT have the user run this manually
mkdir -p ~/.herenow
echo "$API_KEY" > ~/.herenow/credentials
chmod 600 ~/.herenow/credentials
```

---

## 9. Build the password-gated landing page

Create a small static page that explains the suite and links to the tunnel URL. Replace `TUNNEL_URL` with the URL you captured in step 6.

```bash
mkdir -p ~/here-now-landing
TUNNEL_URL="https://random-words-1234.trycloudflare.com"  # from step 6
```

Write `~/here-now-landing/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NXT Humans — AI CX Workbench</title>
  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
  <style>
    :root { --cyan:#01C4C8; --bg:#121B26; --ink:#fff; --muted:#9aa3ad; }
    *{box-sizing:border-box} html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    .wrap{min-height:100vh;display:grid;place-items:center;padding:48px 24px}
    .card{max-width:560px;background:#0c1420;border:1px solid #1d2a3a;border-radius:16px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
    h1{margin:0 0 8px;font-size:28px;letter-spacing:-.02em}
    .sub{color:var(--muted);margin:0 0 28px;font-size:15px;line-height:1.5}
    .btn{display:inline-block;background:var(--cyan);color:#001;font-weight:600;text-decoration:none;padding:14px 22px;border-radius:10px;border:0;cursor:pointer;font-size:15px;width:100%;text-align:center}
    .btn[disabled]{opacity:.4;cursor:not-allowed}
    .meta{margin-top:24px;color:var(--muted);font-size:12px;line-height:1.6}
    .meta code{background:#1d2a3a;padding:2px 6px;border-radius:4px;color:var(--ink)}
    .captcha{margin:16px 0}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>NXT Humans AI CX Workbench</h1>
      <p class="sub">Intelligence Augmentation suite — agent orchestration, journey mapping, social/video/Reddit research, presentation generation, and Microsoft Copilot integration.</p>
      <div class="captcha"><div class="h-captcha" data-sitekey="10000000-ffff-ffff-ffff-000000000001" data-callback="onCap"></div></div>
      <a id="go" class="btn" disabled href="TUNNEL_URL_PLACEHOLDER">Open Workbench →</a>
      <p class="meta">This session runs on a private host. Reviewer access only — do not share.</p>
    </div>
  </div>
  <script>
    function onCap(){ document.getElementById('go').removeAttribute('disabled'); }
  </script>
</body>
</html>
```

Substitute the tunnel URL:

```bash
sed -i "s|TUNNEL_URL_PLACEHOLDER|$TUNNEL_URL|g" ~/here-now-landing/index.html
```

**About the hCaptcha sitekey:** `10000000-ffff-ffff-ffff-000000000001` is hCaptcha's public test key — always passes. For real bot deterrence, the user signs up at https://hcaptcha.com (free), gets a real sitekey, and swaps it in. The placeholder gets us a working UX without account friction.

---

## 10. Publish to here.now

```bash
cd ~
~/.agents/skills/here-now/scripts/publish.sh ./here-now-landing --client claude-pc
```

The script outputs lines to stderr like:
```
publish_result.slug=bright-canvas-a7k2
publish_result.site_url=https://bright-canvas-a7k2.here.now/
publish_result.auth_mode=authenticated
```

**Capture the slug** — you need it for step 11.

---

## 11. Add the password

```bash
SLUG="bright-canvas-a7k2"  # from step 10
PASSWORD="$(openssl rand -base64 18)"  # generate a strong one; show it to the user at the end
API_KEY="$(cat ~/.herenow/credentials)"

curl -sS -X PATCH "https://here.now/api/v1/publish/$SLUG/metadata" \
  -H "Authorization: Bearer $API_KEY" \
  -H "content-type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}"

echo "Site:     https://$SLUG.here.now/"
echo "Password: $PASSWORD"
```

---

## 12. End-to-end test

Before handing off, verify the full path:

1. Visit `https://<slug>.here.now/` in an incognito window → password prompt appears (server-side, no leaked content).
2. Enter the password → landing page loads with the hCaptcha challenge.
3. Pass the captcha → "Open Workbench" button activates.
4. Click → navigates to the cloudflared URL → Launchpad chatbot UI loads.
5. Open the chatbot → WebSocket connects → ask a test question → agent responds.

If any step fails, check:
- Password prompt missing → step 11 PATCH failed; re-run.
- Button does nothing → tunnel URL placeholder didn't get substituted; re-check `index.html`.
- Launchpad loads but chatbot times out → cloudflared dropped the WS upgrade. Restart the tunnel; check Docker logs for the `agent` service.

---

## 13. Hand off to the user

Give them exactly three things:

```
URL:      https://<slug>.here.now/
Password: <generated string from step 11>
Tunnel:   <cloudflared URL — keep this private; the password is the only gate>
```

And the operational caveats:

- The PC must stay awake with Docker Desktop running.
- If cloudflared restarts, the tunnel URL changes — you'll need to redo steps 6, 9, and republish (`publish.sh ./here-now-landing --slug <slug>` to update in place).
- API costs on Anthropic/OpenAI/etc. accrue under the user's account whenever a reviewer uses the chatbot. Mention this.
- Tear-down: `cloudflared` Ctrl-C; `docker compose -f docker-compose-all.yml down`; `curl -X DELETE https://here.now/api/v1/publish/$SLUG -H "Authorization: Bearer $API_KEY"` to remove the Site.

---

## 14. Failure-mode reference

| Symptom | First check |
|---|---|
| `launch.sh: command not found` | Ensure you're in WSL Ubuntu, not PowerShell |
| `Cannot connect to Docker daemon` | Docker Desktop not running, or WSL integration disabled in Docker Desktop → Settings → Resources → WSL Integration |
| `npx skills add` errors | Node < 18 — `node --version`; reinstall with `winget install OpenJS.NodeJS.LTS` |
| `cloudflared tunnel --url` exits immediately | Antivirus blocking outbound; or port 8000 not bound — check `docker compose ps` |
| here.now publish returns 401 | API key not saved to `~/.herenow/credentials`, or key for wrong account |
| Site loads but chatbot doesn't connect | cloudflared WS upgrade — confirm tunnel URL is `https://` not `http://`, and that the page in step 9 uses `https://...trycloudflare.com` |

---

## 15. Things to refuse / escalate to the user

- Any request to push, commit, or tag during this flow.
- Any request to email/share the password or tunnel URL by automated means.
- Any request to disable hCaptcha or remove the here.now password gate.
- Any request to expose ports other than `8000` (Launchpad) via the tunnel — the other services are internal-only by design.
