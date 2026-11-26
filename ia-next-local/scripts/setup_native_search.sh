#!/usr/bin/env bash
# Run from Windows with wsl -d Ubuntu -u root -- bash <absolute Linux path to this script>.
set -euo pipefail

source_root="$(cd "$(dirname "$0")/.." && pwd)"
runtime=/opt/ia-next-native
searx_commit=a30b2d47492ab46ae82ce25ee62a31626565cf67

apt-get update
apt-get -o DPkg::Lock::Timeout=180 install -y python3-venv python3-dev build-essential ca-certificates git libxslt1-dev

install -d -m 0755 "$runtime"
if [[ ! -d "$runtime/searxng/.git" ]]; then
    git clone --filter=blob:none --no-checkout https://github.com/searxng/searxng.git "$runtime/searxng"
fi
git -C "$runtime/searxng" fetch --depth=1 origin "$searx_commit"
git -C "$runtime/searxng" checkout --detach "$searx_commit"
python3 -m venv "$runtime/search-venv"
"$runtime/search-venv/bin/pip" install --disable-pip-version-check -r "$runtime/searxng/requirements.txt" 'waitress==3.0.2'
if [[ ! -e "$runtime/searxng-settings.yml" ]]; then
    sed "s/secret_key:.*/secret_key: \"$(python3 -c 'import secrets; print(secrets.token_hex(32))')\"/" \
        "$source_root/search/settings.yml" > "$runtime/searxng-settings.yml"
    chmod 0644 "$runtime/searxng-settings.yml"
fi

cat >/etc/systemd/system/ia-next-native-search.service <<'UNIT'
[Unit]
Description=IA Next Native metasearch
After=network-online.target

[Service]
Type=simple
DynamicUser=yes
Environment=SEARXNG_SETTINGS_PATH=/opt/ia-next-native/searxng-settings.yml
Environment=PYTHONDONTWRITEBYTECODE=1
WorkingDirectory=/opt/ia-next-native/searxng
Environment=PYTHONPATH=/opt/ia-next-native/searxng
ExecStart=/opt/ia-next-native/search-venv/bin/waitress-serve --listen=127.0.0.1:8891 searx.webapp:app
Restart=on-failure
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
InaccessiblePaths=/mnt

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now ia-next-native-search.service
