// A small Markdown renderer for reports and replies, reused from the first workspace page and hardened.
// Everything is HTML-escaped FIRST (including both quote characters, so a URL can never break out of an
// attribute), then only headings, lists, tables, quotes, bold, italic, code, links and paragraphs are
// rendered. Text from web pages, uploads and models can never inject markup.

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TRAIL = /[.,;:!?]+$/;

function linkify(escaped) {
  // Bare URLs, with trailing punctuation left outside the link.
  return escaped.replace(/https?:\/\/[^\s<)|\]]+/g, (url) => {
    const tail = (url.match(TRAIL) || [''])[0];
    const href = tail ? url.slice(0, -tail.length) : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>${tail}`;
  });
}

export function inline(s) {
  const keep = [];
  let t = esc(s);
  // Markdown links [text](https://...) become placeholders so the bare-URL pass leaves them alone.
  t = t.replace(/\[([^\]\n]{1,300})\]\((https?:\/\/[^\s)]+)\)/g, (_, text, href) => {
    keep.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    return `\u0000${keep.length - 1}\u0000`;
  });
  t = t.replace(/`([^`\n]+)`/g, (_, code) => {
    keep.push(`<code>${code}</code>`);
    return `\u0000${keep.length - 1}\u0000`;
  });
  t = linkify(t)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
    .replace(/\[(S\d+)\]/g, '<sup class="cite"><button type="button" class="cite__btn" data-src="$1" aria-label="Open source $1">$1</button></sup>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)]);
}

const BLOCK_START = /^(#{1,6}\s|\||>\s?|\s*([-*]|\d+\.)\s|---+\s*$|\s*`{3,}|\s*~{3,})/;
const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;

// 16 Nov audit: the owner's #diagram and #mindmap replies printed their Mermaid source as one run-on paragraph,
// because fenced blocks were not understood (the lines were joined into a <p>). Fenced blocks now keep every line;
// a ```mermaid block becomes a diagram placeholder that the page draws with the bundled Mermaid library (the source
// stays escaped text, Mermaid runs with securityLevel "strict"), with the source one click away.
function fencedBlock(lang, body) {
  const src = body.join('\n');
  if (/^mermaid$/i.test(lang)) {
    return `<figure class="md-diagram"><pre class="mermaid">${esc(src)}</pre>` +
      `<details class="md-diagram__src"><summary>Diagram source</summary><pre><code>${esc(src)}</code></pre></details></figure>`;
  }
  return `<pre class="md-code"><code${lang ? ` data-lang="${esc(lang)}"` : ''}>${esc(src)}</code></pre>`;
}

export function renderMarkdown(md) {
  const out = [];
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    const f = l.match(FENCE);
    if (f) {
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${f[1][0] === '`' ? '`' : '~'}{${f[1].length},}\\s*$`).test(lines[i])) { body.push(lines[i]); i++; }
      i++;                                                     // the closing fence (or the end of the reply)
      out.push(fencedBlock(f[2], body));
      continue;
    }
    if (/^#{1,6}\s/.test(l)) {
      const n = Math.min(l.match(/^#+/)[0].length + 1, 6);
      out.push(`<h${n}>${inline(l.replace(/^#+\s*/, ''))}</h${n}>`);
      i++; continue;
    }
    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\|\s*:?-/.test(r));
      out.push('<div class="md-table"><table>' + body.map((r, k) => '<tr>' + cells(r).map((c) => (k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('') + '</tr>').join('') + '</table></div>');
      continue;
    }
    if (/^>\s?/.test(l)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s/, ''))}</li>`);
        i++;
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    if (l.trim()) {
      const para = [];
      while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) { para.push(lines[i]); i++; }
      if (!para.length) { para.push(lines[i]); i++; }
      out.push(`<p>${inline(para.join(' '))}</p>`);
      continue;
    }
    i++;
  }
  return out.join('\n');
}

// Headings of a rendered report, for the reader's contents list.
export function headings(md) {
  return String(md ?? '').split('\n').filter((l) => /^#{2,3}\s/.test(l))
    .map((l) => ({ level: l.match(/^#+/)[0].length, text: l.replace(/^#+\s*/, '').replace(/\*\*/g, '') }));
}
