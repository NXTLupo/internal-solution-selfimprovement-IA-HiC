---
id: brand/image-slots/personas-competitive.md
title: Image Slots — personas / persona-detail / competitive (NXT GOLD)
type: brand
updated: 2026-06-17
chunks:
  - id: "brand/image-slots/personas-competitive.md#c0"
    char_span: [0, 524]
    sentence_count: 5
    key_terms: [persona-detail, competitive, personas, isqhavm7si4qhawb7y9c2z, setsharedplugindata, fills, nxt, placeholders]
    concepts: [persona-detail, competitive, personas, fills]
    token_count: 134
  - id: "brand/image-slots/personas-competitive.md#c1"
    char_span: [526, 2366]
    sentence_count: 1
    key_terms: [thumbnail, light, self-serve, personas, customer, repeater, persona-detail, never]
    concepts: [thumbnail, light, self-serve, personas, customer]
    related_chunks: ["brand/image-slots/personas-competitive.md#c2", "brand/image-slots/personas-competitive.md#c4"]
    token_count: 512
  - id: "brand/image-slots/personas-competitive.md#c2"
    char_span: [2113, 2843]
    sentence_count: 1
    key_terms: [competitive, resolution, self-serve, thumbnail, light, call, documentation, handle-time]
    concepts: [competitive, resolution, self-serve, thumbnail, light]
    related_chunks: ["brand/image-slots/personas-competitive.md#c1"]
    token_count: 190
  - id: "brand/image-slots/personas-competitive.md#c3"
    char_span: [2877, 3235]
    sentence_count: 3
    key_terms: [matrix, dense, content-complete, cell-evidence, edge-to-edge, competitive, capability, destroying]
    concepts: [matrix, dense]
    section: Deliberately left image-free
    token_count: 83
  - id: "brand/image-slots/personas-competitive.md#c4"
    char_span: [3247, 4181]
    sentence_count: 3
    key_terms: [row, journey, thumbnails, thumbnail, behavior, personas, content, touched]
    concepts: [journey, thumbnails, thumbnail, behavior, personas]
    related_chunks: ["brand/image-slots/personas-competitive.md#c1"]
    section: Notes
    token_count: 253
---
# Image Slots — personas / persona-detail / competitive

Blank `img-slot` placeholders placed into the NXT GOLD components on the personas (`111:159`),
persona-detail (`119:159`), and competitive (`131:159`) pages of Figma file `iSQhAVM7SI4QHAWB7y9C2z`.
Each slot is a transparent FRAME (fills=[], strokes=[]) nested INSIDE the archetype COMPONENT so the
NU mode twin inherits it. Metadata lives in `setSharedPluginData('nxt', …)`. Bounds are relative to
each component's top-left. The `illustrator` agent fills these later.

| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |
|---|---|---|---|---|---|---|
| personas (596:2) | 678:5471 | thumbnail | light | 290,762,150,150 | The Self-Server | Solving alone, surrounded by stale help-center articles that miss the issue; self-reliance hitting a wall |
| personas (596:2) | 678:5473 | thumbnail | light | 715,762,150,150 | The Repeater | Re-explaining the same issue handoff after handoff; a thread passed between owners, context resetting each hop |
| personas (596:2) | 678:5475 | thumbnail | light | 1140,762,150,150 | The Waiter | Stalled in a queue for an answer the system already knows; passive holding, a dropped callback, time slipping |
| personas (596:2) | 678:5477 | thumbnail | light | 1565,762,150,150 | The Churner | Quietly leaving when the fix arrives too late; a customer walking away, a closed account, a renewal lost |
| persona-detail · The Repeater (602:2) | 678:5507 | panel | light | 172,767,380,150 | The Repeater | A customer re-telling the same story to a chain of fresh-faced agents, the thread never owned; mid-explanation, patience thinning |
| persona-detail · Self-Serve Seeker fingerprint (602:3) | 678:5524 | panel | dark | 1322,565,460,230 | The Self-Serve Seeker | Reaching for the documented fix the instant a task breaks mid-flow; self-sufficiency, momentum, the help-doc as trusted first move, never a ticket |
| competitive · self-serve resolution (603:3) | 678:5530 | thumbnail | light | 194,316,80,80 | Amazon | Designing the top contact reasons out of existence so the customer never needs to call; a support funnel collapsing to zero |
| competitive · self-serve resolution (603:3) | 678:5531 | thumbnail | light | 194,485,80,80 | Stripe | Documentation versioned with the API so the doc is the first responder; living docs in lockstep with code, never stale |
| competitive · self-serve resolution (603:3) | 678:5532 | thumbnail | light | 194,653,80,80 | Zappos | The call itself treated as the brand moment, no handle-time targets; service as the product, an open unhurried human line |
| competitive · self-serve resolution (603:3) | 678:5533 | thumbnail | light | 194,822,80,80 | Field median | A help center refreshed only quarterly, deflection measured but freshness owned by no one; aging content, drift |

## Deliberately left image-free

- **competitive · CX capability peer matrix (603:2)** — content-complete dense 6-column x 4-row
  benchmark table that already fills the canvas edge-to-edge, plus a cell-evidence source line and
  takeaway band. No clear space; per rule 4 ("clean data IS the design") forcing a per-peer thumbnail
  would require destroying the dense matrix. Left image-free.

## Notes

- `imgOptional`: the four per-element behavior thumbnails on personas (596:2), the Repeater portrait
  (602:2), and the Self-Serve Seeker figure (602:3) are `false` (the layout reserves room for them).
  The four competitive per-peer emblems on 603:3 are `true` (small accent marks; the row content
  stands on its own without them).
- personas (596:2) was GROWN from 1080 -> 1250 tall (dark rail 111:3 grown to match, takeaway band
  111:157 and dot-mark 111:4 pushed down +170) to open a thumbnail row beneath the four behavior
  columns, mirroring the journey 595:2 pattern (5 phase thumbnails). The thumbnail row was added as a
  new auto-layout child of the content frame 111:19 between the persona-cols matrix and the journey
  band, so it reflows as a true table row.
- All four pages: only the `· nxt` components were touched; the `· NU` twins inherit via mode.
- Journey page 75:2 / 595:2 NOT touched (owned by another pass).
