# Fable 5 -> Opus 4.8 temporary swap (2026-06-13)

**Why:** Anthropic temporarily banned usage of Claude Fable 5. Every HiC code path
that routed deliverable/artifact generation to `claude-fable-5` was repointed to
its stand-in `claude-opus-4-8`. Both are Anthropic models, both reject the
`temperature` param (the proxy strips it via the `opus-4-[789]|fable` regex), and
both price at $5/$25 per 1M tokens, so the swap is behavior-preserving.

**Swap back when the ban lifts:** re-introduce a `claude-fable-5` registry entry and
repoint the routing strings. The reverse is mechanical.

## What changed

### Routing strings (repointed `claude-fable-5` -> `claude-opus-4-8`)
- `services/corpusChatService.ts` — `ChatModel` union, `AVAILABLE_MODELS` entry,
  `routedModelFor()` force-route helper, the `isArtifactGenerationMessage` force-route
  block, `callClaude()` default model.
- `services/geminiService.ts` — `_runBreadthShard` themes shard primary + trace.
- `components/CorpusChatPanel.tsx` — `model_id` / `preferModel` / `model` call sites,
  the "# Artifacts" auto-routing chip, the footer hint.
- `design-desk/DesignDeskChat.tsx` — 3 designer-chat call sites.
- `design-desk/services/chatToFreeform.ts` — `FreeformGenerationModel` union, resolver
  case, `callClaude` dispatch.
- `design-desk/services/chatToSlideSpec.ts` — `SlideSpecModel` union, resolver case,
  Anthropic dispatch.
- `proxy/app.py` — startup allowlist (deduped against the existing opus-4-8 entry).

### Registry definitions (Fable entry removed because Opus 4.8 already existed)
- `services/aiRouter.ts` — deleted the duplicate `claude-fable-5` MODEL_REGISTRY entry.
- `services/costMeter.ts` — removed the `claude-fable-5` `ModelId` union member, pricing
  row, and display name; `normalizeModel('...fable...')` now returns `claude-opus-4-8`.
- `proxy/model_registry.py` — `claude-fable-5` marked `status: "banned"` with
  `successor: "claude-opus-4-8"`; `check_model` now flags `banned` (route to successor,
  not an opaque 400). Kept (not deleted) so a stray Fable call is caught loud.

## To reverse (ban lifted)
1. `aiRouter.ts`: re-add the `claude-fable-5` MODEL_REGISTRY entry.
2. `costMeter.ts`: re-add the union member + pricing + display; revert the `fable`
   normalize line to `return 'claude-fable-5'`.
3. `model_registry.py`: set `claude-fable-5` back to `status: "active"`.
4. Repoint the routing strings in the files above from `claude-opus-4-8` back to
   `claude-fable-5` (the comments at each site still name Fable for findability).
5. `corpusChatService.ts` AVAILABLE_MODELS: restore the conservative `200K`/`32K`
   caps if Fable's verified caps differ from Opus 4.8's 1M/64K.
