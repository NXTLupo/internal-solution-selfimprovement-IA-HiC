/* NXT Artifact System — interactions. Self-contained, no deps.
   Working tabs via event delegation so it survives any markup nesting the
   model emits. Contract: a tab group is a [data-tabs] container holding
   .nxt-tab buttons each with data-tab="<id>", and sibling .nxt-panel
   elements each with data-panel="<id>". First tab/panel is active by default.
   Fixes the dead-tab failure across arch / tech-audit / org / meta-themes / persona. */
(function () {
  function activate(group, id) {
    var tabs = group.querySelectorAll('.nxt-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-selected', tabs[i].getAttribute('data-tab') === id ? 'true' : 'false');
    }
    // panels may be inside the group or in a sibling region scoped by data-tabs-for
    var scope = group.closest('[data-tabs-scope]') || group.parentNode || document;
    var panels = scope.querySelectorAll('.nxt-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].setAttribute('data-active', panels[j].getAttribute('data-panel') === id ? 'true' : 'false');
    }
  }
  function initGroup(group) {
    var tabs = group.querySelectorAll('.nxt-tab');
    if (!tabs.length) return;
    var hasActive = false;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-selected') === 'true') hasActive = true;
    }
    if (!hasActive) activate(group, tabs[0].getAttribute('data-tab'));
  }
  function init() {
    var groups = document.querySelectorAll('[data-tabs]');
    for (var i = 0; i < groups.length; i++) initGroup(groups[i]);
  }
  // Delegated click: works for tabs added any time.
  document.addEventListener('click', function (e) {
    var tab = e.target && e.target.closest ? e.target.closest('.nxt-tab') : null;
    if (!tab) return;
    var group = tab.closest('[data-tabs]') || tab.parentNode;
    var id = tab.getAttribute('data-tab');
    if (id) { e.preventDefault(); activate(group, id); }
  });
  // Keyboard support
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tab = document.activeElement;
    if (!tab || !tab.classList || !tab.classList.contains('nxt-tab')) return;
    var group = tab.closest('[data-tabs]'); if (!group) return;
    var tabs = Array.prototype.slice.call(group.querySelectorAll('.nxt-tab'));
    var idx = tabs.indexOf(tab);
    var next = e.key === 'ArrowRight' ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
    if (next) { next.focus(); next.click(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
