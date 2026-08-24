# HeyGen cloud render, publish, and the avatar / TTS catalog

**What was proposed.** Use HyperFrames' HeyGen-backed features for the suite: cloud
render, `publish`, the hosted MCP connector, and the media catalog with TTS voices and
avatars for narrated client videos.

**When.** 2026-08-21, during the E3.1 assessment.

**Why it was rejected.** Three separate reasons, and each is sufficient on its own.

Cloud render and publish consume HeyGen credits for something the local path already does:
a 60-second 1080p render finished in about 85 seconds on the reference machine with no
account attached. Paying an external dependency for a capability we already have locally
adds a failure mode and removes none.

The hosted MCP connector is interactively authenticated, so it is absent in headless and
cron runs, which is exactly where a render service is most useful.

Synthetic voice for client deliverables was already settled once on this project: the
`brief-dialog` decision rejected audio for the consulting use case on voice IP risk and
the multi-speaker quality gap, and chose a text brief instead because partners read
briefs. An avatar narrating a client's strategy carries the same risk with a face
attached.

**What would change the answer.** A client explicitly asking for a narrated or presented
video, with the voice question settled on their side (their own talent, their own
licensed voice). Then the question becomes which renderer, and the local path plus a
supplied audio track is still the first thing to try.
