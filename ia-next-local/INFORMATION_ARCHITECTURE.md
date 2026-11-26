# IA Next information architecture (2026-11-19)

How the IA Next workspace is organized and why. Read this before adding a capability or changing the home page.

## Principles (owner direction, 2026-11-19)

- **Minimal.** The interface is not a document. Few words on screen; no paragraphs, captions or explanatory figures
  on the page itself. ("The UI is too wordy.")
- **Detail on demand.** Show little by default; elegant panels expand when someone asks. ("Don't show everything at
  once, have elegant panels that provide on demand expanded information.")
- **No duplicates.** One place to make things. ("The studio panel is redundant to 'What do you want to make?'")
- **No status clutter.** Counts and analytics live behind one sidebar item. ("These detailed analytics are useless
  clutter.")
- **One panel paradigm.** Every panel opens as the right-hand flyout (the sheet): engagements, Make, Data packs,
  capability panels, updates, memory, schedules, spend, how to ask, evidence, work viewer. Nothing opens over the chat.
- **One place per thing.** An engagement holds its work, its chats and its files; the sidebar lists engagements only.

The overview-page standard (`hic-workspace/wiki/design-system/overview-exemplars/`) governs written artifacts, not the
app's own interface.

## One source of truth

`web/catalog.js` lists every capability (title, tile label, one-line description, full description, who does it,
example requests), the 18 HiC document kinds, the steering options and the coaching rules. The home tiles, the
composer's Make menu and the composer coaching all read it. `tests/test_capability_catalog.py` fails when the agent
gains a document kind the page does not offer, or when a steering option disappears.

## Site map

```
Sidebar
  New conversation
  ENGAGEMENTS
    Everything                         all work and all chats, including chats in no engagement
    each engagement                    -> focuses it and opens its flyout
  Updates (count) · Memory · Schedules · Spend today

Top bar: status · approvals waiting · spend

Engagement flyout (right)              Work | Chats | Files      actions: Hide from the list (with Undo) · Stop focusing
  Work                                 its decks, reports, maps and media
  Chats                                the conversations that worked in it; one click reopens
  Files                                Add files · Data packs · All on / All off · each source with guide and quotes
                                       · Reddit listening as one row

Home (empty conversation)
  What do you want to make?            one line under it
  Gather | Make | Keep                 tabs; one group of tiles at a time
  tiles                                icon and one or two words -> capability flyout
                                       (description, who does it, options + Start, example requests)
  How to ask · Where the evidence comes from · Everything in one list    flyouts
  Recent work                          four cards, See all -> Everything flyout

Composer: Engagement · Make · Files · Data packs · Dictate · send
  Engagement: which engagement the request and its work go to; picker flyout to choose one, search, or create
  one by name ("New engagement" lets IA Next name it from the request). Capability panels show "For <engagement>
  · Change".
  Make and Data packs open the right-hand flyout
  coaching line only while a request asks for an output
```

## Labels

| Label | Means |
|---|---|
| Engagement | A body of work: its files, findings, Reddit listening and everything made from them |
| Focus | Scoping the conversation and the Sources panel to one engagement |
| Data packs | HiC's industry and theme source collections; "Auto" lets IA Next choose from the question |
| Make | Every kind of work IA Next does |
| [bracketed] part | A slot in a request; Tab moves between slots; a message is not sent while one is unfilled |
| Updates | What finished, failed or paused since you last looked |

## Layout rule

The home page reads the width of its own column (container queries on `.home`), because the Sources panel narrows
the column without changing the window width.
