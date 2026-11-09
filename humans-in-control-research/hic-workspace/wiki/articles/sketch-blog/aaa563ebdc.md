---
id: articles/sketch-blog/aaa563ebdc.md
url: "https://www.sketch.com/blog/frames/"
url_hash: "aaa563ebdc"
kind: "article"
source: "sketch_blog"
title: "Frames and Graphics: A not-so-short guide"
author: ""
date: "2025-05-27T02:00:00+00:00"
tier: 3
method: "source-native"
extracted_at: "2026-09-10T17:29:39.017859+00:00"
chars: 10000
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:29:38.999Z"
relevance: 15
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "01088a0b2a81d9cb"
relevance_by_goal: {"8429cfd39d4f":5,"5a163910d68e":15}
chunks:
  - id: "articles/sketch-blog/aaa563ebdc.md#c0"
    char_span: [0, 103]
    sentence_count: 1
    key_terms: [frames, not-so-short, graphics, sketch, source, guide, https, blog]
    concepts: [frames]
    token_count: 28
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/aaa563ebdc.md#c1"
    char_span: [105, 2451]
    sentence_count: 29
    key_terms: [work, card, graphical, frames, interface, container, designing, icon]
    concepts: [graphical, interface, frames, container, designing]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/aaa563ebdc.md#c2"
    char_span: [2157, 4487]
    sentence_count: 26
    key_terms: [frames, frame, size, top-level, contents, canvas, artboards, fit]
    concepts: [frames, frame, top-level, contents, canvas]
    related_chunks: ["articles/sketch-blog/aaa563ebdc.md#c3", "articles/sketch-blog/aaa563ebdc.md#c4"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/aaa563ebdc.md#c3"
    char_span: [4199, 6517]
    sentence_count: 19
    key_terms: [frame, layer, fill, frames, hierarchy, contents, parent, within]
    concepts: [frame, layer, hierarchy, frames, contents]
    related_chunks: ["articles/sketch-blog/aaa563ebdc.md#c2", "articles/sketch-blog/aaa563ebdc.md#c4"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/aaa563ebdc.md#c4"
    char_span: [6205, 8565]
    sentence_count: 22
    key_terms: [layer, frame, contents, parent, select, size, layers, within]
    concepts: [layer, frame, contents, parent, select]
    related_chunks: ["articles/sketch-blog/aaa563ebdc.md#c2", "articles/sketch-blog/aaa563ebdc.md#c3"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/aaa563ebdc.md#c5"
    char_span: [8283, 10105]
    sentence_count: 16
    key_terms: [layer, fit, size, fixed, layers, sizing, fill, default]
    concepts: [layer, fixed, layers, sizing, default]
    token_count: 419
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/frames/","kind":"article","date":"2025-05-27"}]
---
# Frames and Graphics: A not-so-short guide

Source: [sketch_blog](https://www.sketch.com/blog/frames/)

With our Athens release, we’ve replaced Artboards with two new containers — Frames and Graphics. Together with Stacks, they represent the biggest shift to designers’ workflow in Sketch in years. Internally, we’ve taken to saying that Sketch “feels like a new app”.
So — what are frames? How are they different from artboards? What are graphics? Where does this leave groups? What happens to your documents and workflow?
We’ll get to all of this, but let’s start with the problem we wanted to solve.
Why did we build Frames and Graphics?
Picture this: you’re designing a user profile card for a web app.
- You draw a background rectangle, add text and buttons, then group them. You add an icon, then move the card but the icon is left behind — it was on top of the group but not inside.
- You fix that in the layer list, then resize the card, but everything stretches. So you undo, then pin and fix size every layer in the card, and check that it resizes properly.
- Later on, you ⌘-click on the card and move it, but only the background rectangle moves. So you undo, hit Esc to select the card, and move it.
I could go on, but you get it. It’s a lot of tripwires. Maybe you learned to avoid them, or just accepted them — even still, it’s tedious at best, and frustrating at worst. This isn’t always the case, though. If you were designing an icon, those same behaviors would actually feel natural.
The key challenge is that interface work and graphical work are really quite different in their mechanics. Sketch has historically favored graphical work — that’s why designing a simple profile card requires so much intentionality.
The rectangles-and-groups workflow wasn’t great for interface work, and it didn’t play well with stacks. But we didn’t want to flip things entirely and make graphical work feel like an afterthought. We wanted both interface and graphical work to have proper, purpose-built support. Our solution was to give each its own container:
- Frame: a container for interface design and layout work.
- Graphic: a container for icon, illustration, and other graphical work.
Frames 101
Frames have a few important qualities:
- They’re nestable. They may contain and be contained by other layers.
- They support styling. Fills, borders, rounded corners, shadows, it’s all there.
- They reparent layers. Adding or moving something onto the frame nests it in the frame.
- They define their size. Typically a fixed size, but can also fit contents with stack layout.
If you’re familiar with Sketch, you can think of frames as a natural evolution of artboards. In fact, artboards no longer exist. When you open an existing document in Athens, your artboards and symbol sources are now frames.
How to create a frame
Press F, use the Insert menu or toolbar button to use the Frame tool, then:
- Draw a frame with whatever size you want
- Pick a template in the Inspector to insert as a top-level frame
- Or click on the canvas to insert a frame the same size as the last one you interacted with.
You can also wrap your selection in a new frame with ⌘F.
We call frames you place directly on the canvas top-level frames. Frames you draw within other frames are called nested frames. Top-level frames display their name on the canvas, and a single-click selects their contents.
Frames have an explicit size (width and height), and don’t automatically size to fit their contents. You can use Size to Fit ⇧⌘F, but your frame won’t automatically resize as its contents change. You can set stacks (frames with stack layout applied) to always fit their contents.
You can position layers partly, or even fully, outside the frame’s bounds. A frame’s “Clip content” property controls whether out-of-bounds content is visible or not. Having content out of bounds can like this can be useful in prototyping.
How to style frames
You can style frames much like shapes, with opacity, corners, fills, borders, shadows. You can also give them a blur and tint. You can also apply Layer Styles.
Frames may get a default style depending on how you make them:
- Inserting a top-level frame gives it a white fill.
- Inserting a nested frame gives it a blue fill — this alternates between two shades, so multiple nested frames contrast.
- Wrapping your selection in a frame ⌘F will give it no styles.
Frames on the canvas always reflect their styles. If a top-level frame only appears white if it has a white fill — if it has no fill, its background is transparent.
Sometimes, you’ll want a top-level frame to have a fill so you can better see its contents, but the fill isn’t part of your design. In this case, disabling “Include fills as content” in the Inspector means it won’t show up in exports, prototypes, or instances (if it’s a symbol).
Finally, there’s some nuance to how shadows work: if a frame has a single shadow, and no fills, borders, or blur, the shadow applies to its contents (like groups). Otherwise, the shadow applies to the frame itself.
Frames, layers, and parenting
As you work with frames, you’ll notice a few things:
- When you draw a frame around existing layers, they become children of that new frame.
- When you insert a new layer, it becomes a child of the closest frame that surrounds it.
- When you drag a layer around, its parent frame changes.
You don’t even need to learn these rules because we’ve made it visual. When you select a layer, we highlight its parent frame with a dashed border. When you create or move layers, we highlight their new parent frame with a solid border.
Parenting aims to keep the visual hierarchy on the canvas in sync with the hierarchy in the layer list. By aiming to have the two match automatically, you don’t have to fiddle so much with the layer list, nor keep an up-to-date mental model of your layer hierarchy.
In practice, if an element looks to be inside another on the canvas, it should be inside it in the layer tree — so when you move it, everything within it (and only within it) moves too.
In cases where you don’t want Sketch to automatically parent a layer for you, you can press the Space bar to skip reparenting. Or, you can adjust the hierarchy in the layer list.
Selecting frames and their contents
You can select a frame by clicking anywhere within its bounds, including in empty space, even (unlike groups) if it doesn’t have visible styles. If a top-level frame has contents, clicking within its bounds will select that content. Holding ⌘ and clicking will select any frame directly.
To quickly select contents within a frame, press X, then click-and-drag to draw a marquee selection. This selects any layers within it, at any level, but not the frame itself. You can also hold X as you click-and-drag.
If you’ve selected a frame (or any other container), you can press Enter to select all its children. Select All ⌘A selects all other layers in the same container as the layer you’ve selected — or all top-level layers on the page if you haven’t selected anything. These actions are also in the Select menu when you right-click a layer on the canvas.
Working within frames
Aside from being the container for stack layout, what makes a frame purpose-built for interface design is how you work with its contents. Add a layer to a frame and you’ll notice two things:
- Drop-down menus for Width and Height in the Inspector.
- Next to them, a rectangular control with an A surrounded by four T-shaped lines; and on the canvas, dashed lines from your selection to a dashed box around the parent frame.
These elements control sizing and pinning— two vital ingredients for layout work in frames. We’ve made some very important changes here that affect all layers in Sketch.
Sizing options for frame contents
Sizing controls how a layer’s size responds to its parent’s size, or the layer’s own contents. We’ve long had ways to control a layer’s size, but we’ve made some big improvements here.
Sizing is standardized and prominent
A layer’s width and height can be either Fixed, Fit, Fill, or Relative, depending on the context:
- Fixed: the layer’s size is absolute, and won’t proportionally adjust when you resize its parent. It may still resize if you pin it to its parent on both ends — more on this below.
- Fit: the layer’s size will always fit its contents. Available for stacks and text.
- Fill: the layer’s size will fill its parent. Available to layers inside stacks.
- Relative: the layer’s size is relative to its parent. When its parent resizes, it will too.
This combines the two different properties we had: the Fix Size control in the Resizing panel, and the text-only Auto Width / Auto Height / Fixed Size segmented control in the Text panel.
Fixed is the default sizing option
Every new layer will have a Fixed Width and Height, except for text layers you create by clicking or pasting — those default to Fit.
When you resize a frame, layers with default sizing settings (Fixed or Fit) won’t proportionally resize with it. This is a better starting point for interface work.
We’ve built some other conveniences to work with sizing:
- When hovering or dragging an edge/corner of a layer, we show Fit or Fill for the layer’s width and height next to the cursor. Fixed and Relative dimensions just show their size.
- Directly resizing a Fit sized layer changes it to Fixed on the resized axis(es).
- Double-click an edge/corner of a frame, graphic, or text layer to resize to fit its contents. This also changes the layer’s sizing to Fit, if it supports it. You can also do this via ⇧⌘F, the Inspector, the Layer menu, or the Command Bar.
- On layers in stacks, which support Fill, you can ⌥-double-click an edge/corner to set it to Fill.
Pinning frame contents
Pinning controls how a layer’s position responds to its parent’s size, as well as the layer’s own size. This only applies to frames that aren’t stacks, where pinning is out of the picture.
Like sizing, we’ve long had a pinning system, but made some big improvements to it.
By default, layers have top-left pins
When you create a new layer, it gets top and
