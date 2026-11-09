// 2026-10-31 (agent-stack plan WS-E E3): "Since you were last here", HiC's own morning read-out on the Launchpad.
// Reads /api/digest (relayed to research-mcp get_digest); hidden when nothing changed. "Mark read" starts the next
// digest from now.
(function () {
  const host = document.getElementById('hic-digest');
  if (!host) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function render(d) {
    if (!d || !Array.isArray(d.sections) || !d.sections.length) { host.style.display = 'none'; return; }
    const sections = d.sections.map(s => `
      <div style="margin-top:10px">
        <div style="font:600 10px 'IBM Plex Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:#8A8A8A">${esc(s.title)}</div>
        <ul style="margin:4px 0 0 16px;padding:0;font-size:13px;line-height:1.5;color:#33332E">${s.items.slice(0, 6).map(i => `<li>${esc(i.text)}</li>`).join('')}</ul>
      </div>`).join('');
    host.innerHTML = `
      <div style="max-width:1200px;margin:16px auto;padding:14px 18px;background:#FFFFFF;border:1px solid #E4E4DC;border-left:3px solid ${d.needs_attention ? '#CC6644' : '#115054'};font-family:Archivo,system-ui,sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <div>
            <div style="font:600 10px 'IBM Plex Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:#115054">HiC since you were last here</div>
            <div style="font-size:15px;font-weight:600;color:#141414;margin-top:3px">${esc(d.headline)}</div>
          </div>
          <button type="button" id="hic-digest-seen" style="padding:4px 12px;border:1px solid #115054;background:#FFF;color:#115054;cursor:pointer;font-size:11px">Mark read</button>
        </div>
        ${sections}
      </div>`;
    host.style.display = 'block';
    const btn = document.getElementById('hic-digest-seen');
    if (btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await fetch('/api/digest/seen', { method: 'POST' }); host.style.display = 'none'; } catch (e) { btn.disabled = false; }
    });
  }

  fetch('/api/digest').then(r => (r.ok ? r.json() : null)).then(render).catch(() => { host.style.display = 'none'; });
})();
