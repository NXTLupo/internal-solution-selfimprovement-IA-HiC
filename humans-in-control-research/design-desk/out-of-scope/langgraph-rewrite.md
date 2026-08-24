# Rewriting the HiC pipeline on LangGraph

**What was proposed.** Adopt deer-flow's older planner / researcher / coder / reporter
graph by rewriting HiC's generation pipeline on LangGraph.

**When.** 2026-08-20, during the deer-flow harness transfer.

**Why it was rejected.** The premise was out of date: deer-flow 2.0 is not that pipeline.
It is a general SuperAgent harness (a test-pinned middleware chain, governed skill
packages, sub-agents with a wire contract, lifecycle memory), and the write-ups
describing the LangGraph graph describe an earlier version. So the rewrite would have
been toward something the source project had already moved away from.

The transferable parts were the harness patterns, and those transferred without a
framework: a typed step envelope, one ordered chain whose order is pinned by a test,
fail-closed memory admission, evidence slots. All of that now exists in HiC as ordinary
TypeScript with tests, which is cheaper to reason about than a graph runtime and does not
add a dependency to the generation path.

**What would change the answer.** A requirement HiC's current shape cannot meet:
genuinely concurrent multi-agent execution with checkpointing and resume across process
restarts. If that arrives, revisit the framework question on its own merits rather than
as a way to copy deer-flow.
