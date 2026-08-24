# HyperFrames as a screen recorder

**What was proposed.** Use HyperFrames to capture a research run directly, recording the
HiC SPA as it runs and producing a video of the session.

**When.** 2026-08-21, during the E3.1 assessment.

**Why it was rejected.** It does not do that, and the confusion is easy to have because
the output is a video. HyperFrames is a deterministic HTML-to-video renderer: it captures
a paused, seekable timeline frame by frame through Chrome DevTools BeginFrame and encodes
with ffmpeg. Its own router skill explicitly excludes "record a browser session" from
scope. The caller supplies the pixels; the tool supplies composition, motion, transitions
and encode. The working split, verified by producing a real 60-second video, is Playwright
screenshots into a HyperFrames composition.

**What would change the answer.** Nothing about HyperFrames. If screen capture is wanted,
the tool for it is a recorder (Playwright video capture, or ffmpeg on a display), and its
output becomes an input clip to a composition. That is a separate piece of work, not a
different way to configure this one.
