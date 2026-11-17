/**
 * flashcardStudyEngine.ts - 2026-11-09
 * (plans/gemini-notebook-parity-closeout-2026-11-09.md, WS-D1)
 *
 * The live Gemini Notebook comparison found one real quality gap in the flashcard artifact: its
 * 50-card deck keeps per-card "Got It" / "Missed It" counters, so a reader can WORK the cards.
 * HiC's #flashcards rendered correct, cited cards with no study loop at all.
 *
 * The engine is injected HERE, by code, never written by the model: a deterministic string beats
 * a prompt instruction for anything that must behave identically on every run, and a model that
 * writes its own script writes a different one each time. The model only emits the markup
 * contract (`data-card` ids, `.fc-got` / `.fc-missed` buttons, an `#fc-progress` element).
 *
 * Constraints this satisfies:
 *  - Dependency-free and inline: the artifact is a saved standalone document, launched from the
 *    gallery on any machine, with no bundler and no network beyond itself.
 *  - Degrades to a plain readable card list: with scripting off the cards still open and read,
 *    and the study buttons hide themselves rather than sitting there dead.
 *  - Storage is best-effort: progress persists per artifact when localStorage is available and
 *    the deck still works when it is not (private windows, cleared site data, print/export).
 */

/**
 * Does this artifact carry the flashcard study contract?
 *
 * The contract is deliberately ONE attribute: a `data-card` id on each `<details>` card. The
 * controls are synthesized below rather than requested from the model, because the artifact
 * OUTPUT FORMAT rule forbids the model from emitting buttons at all, and because a control the
 * model writes differs run to run. One attribute is a contract a model keeps reliably.
 */
export function isFlashcardArtifact(html: string): boolean {
    const s = String(html || '');
    return /<details[^>]*\sdata-card\s*=\s*"/i.test(s);
}

/** Count the cards the markup declares, so the progress line never guesses. */
export function countCards(html: string): number {
    const ids = new Set<string>();
    for (const m of String(html || '').matchAll(/data-card\s*=\s*"([^"]+)"/g)) ids.add(m[1]);
    return ids.size;
}

const STUDY_STYLES = `
#fc-progress { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.9rem; margin: 0 0 1.25rem; border: 1px solid var(--color-border, rgba(0,0,0,0.12)); border-radius: 2px; background: var(--color-surface, #fff); font: 500 0.85rem/1.3 var(--font-body, system-ui, sans-serif); }
#fc-progress .fc-bar { flex: 1; height: 6px; border-radius: 2px; background: rgba(0,0,0,0.08); overflow: hidden; }
#fc-progress .fc-bar > span { display: block; height: 100%; width: 0; background: var(--color-accent, #B8B800); transition: width 160ms linear; }
#fc-progress .fc-reset { border: 1px solid var(--color-border, rgba(0,0,0,0.18)); border-radius: 2px; background: transparent; padding: 0.25rem 0.6rem; font: inherit; cursor: pointer; }
.fc-controls { display: flex; gap: 0.5rem; }
.fc-got, .fc-missed { border: 1px solid var(--color-border, rgba(0,0,0,0.18)); border-radius: 2px; background: transparent; padding: 0.3rem 0.7rem; margin: 0.75rem 0.5rem 0 0; font: 500 0.82rem/1.2 var(--font-body, system-ui, sans-serif); cursor: pointer; }
.fc-got[aria-pressed="true"] { background: var(--color-accent, #B8B800); color: var(--color-on-accent, #0D0D0D); }
.fc-missed[aria-pressed="true"] { background: var(--color-warn, #CC6644); color: #fff; }
[data-card][data-state="missed"] { box-shadow: inset 3px 0 0 var(--color-warn, #CC6644); }
[data-card][data-state="got"] { opacity: 0.72; }
`.trim();

// One IIFE, no globals beyond a single key, no dependencies.
const STUDY_SCRIPT = `
(function () {
  var root = document, KEY = 'hic-fc-' + (location.pathname || 'deck');
  var cards = [].slice.call(root.querySelectorAll('[data-card]'));
  if (!cards.length) return;
  var bar = root.getElementById('fc-progress');
  var state = {};
  function load() { try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function counts() {
    var got = 0, missed = 0;
    for (var k in state) { if (state[k] === 'got') got++; else if (state[k] === 'missed') missed++; }
    return { got: got, missed: missed, total: cards.length };
  }
  function render() {
    cards.forEach(function (c) {
      var id = c.getAttribute('data-card'), s = state[id] || '';
      if (s) c.setAttribute('data-state', s); else c.removeAttribute('data-state');
      [].slice.call(c.querySelectorAll('.fc-got, .fc-missed')).forEach(function (b) {
        var want = b.classList.contains('fc-got') ? 'got' : 'missed';
        b.setAttribute('aria-pressed', s === want ? 'true' : 'false');
      });
    });
    if (!bar) return;
    var n = counts(), done = n.got + n.missed;
    var pct = n.total ? Math.round((n.got / n.total) * 100) : 0;
    var label = bar.querySelector('.fc-label'), fill = bar.querySelector('.fc-bar > span');
    if (label) label.textContent = n.got + ' of ' + n.total + ' known' + (n.missed ? ', ' + n.missed + ' to revisit' : '') + (done ? '' : ' - mark a card to begin');
    if (fill) fill.style.width = pct + '%';
  }
  if (bar) {
    bar.innerHTML = '<span class="fc-label"></span><span class="fc-bar"><span></span></span><button type="button" class="fc-reset">Reset</button>';
    bar.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('fc-reset')) { state = {}; save(); render(); }
    });
  }
  root.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.fc-got, .fc-missed') : null;
    if (!b) return;
    e.preventDefault();
    var card = b.closest('[data-card]');
    if (!card) return;
    var id = card.getAttribute('data-card'), want = b.classList.contains('fc-got') ? 'got' : 'missed';
    state[id] = state[id] === want ? '' : want;
    if (!state[id]) delete state[id];
    save(); render();
  });
  load(); render();
})();
`.trim();

/**
 * Inject the study engine into a flashcard artifact.
 *
 * Returns the html unchanged for any artifact that does not carry the contract, so this is safe
 * to call on the whole HTML artifact family. The `<noscript>` rule hides the study controls when
 * scripting is off, leaving a clean readable card list.
 */
export function injectFlashcardStudyEngine(html: string): { html: string; injected: boolean; cards: number } {
    const src = String(html || '');
    if (!isFlashcardArtifact(src)) return { html: src, injected: false, cards: 0 };
    // Idempotent: a refine pass must not stack two engines.
    if (src.includes('data-hic-study-engine')) return { html: src, injected: false, cards: countCards(src) };

    const cards = countCards(src);

    // Synthesize the per-card controls. Appending just before each card's </details> keeps them
    // at the end of the answer body, where a reader lands after reading the answer.
    let open = 0;
    const withControls = src.replace(/<details[^>]*\sdata-card\s*=\s*"([^"]+)"[\s\S]*?<\/details>/gi, (block) => {
        const id = (block.match(/data-card\s*=\s*"([^"]+)"/i) || [, ''])[1];
        if (!id) return block;
        open += 1;
        const controls = `<div class="fc-controls"><button type="button" class="fc-got" data-for="${id}">Got it</button><button type="button" class="fc-missed" data-for="${id}">Missed it</button></div>`;
        return block.replace(/<\/details>\s*$/i, `${controls}</details>`);
    });

    // The progress strip goes at the top. If the model already placed the element, fill it in
    // place; otherwise prepend one, so the reader always gets the session line.
    const body = /<div[^>]*\bid\s*=\s*"fc-progress"/i.test(withControls)
        ? withControls
        : `<div id="fc-progress" data-total="${cards}"></div>\n${withControls}`;

    const block = [
        `<style data-hic-study-engine="1">${STUDY_STYLES}</style>`,
        `<noscript><style>#fc-progress, .fc-controls { display: none !important; }</style></noscript>`,
        body,
        `<script data-hic-study-engine="1">${STUDY_SCRIPT}</script>`,
    ].join('\n');
    return { html: block, injected: open > 0, cards };
}
