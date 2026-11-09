---
id: articles/sketch-blog/1f4ebcec63.md
url: "https://www.sketch.com/blog/command-bar-athens/"
url_hash: "1f4ebcec63"
kind: "article"
source: "sketch_blog"
title: "A new chapter for the Command Bar"
author: ""
date: "2025-05-27T03:00:00+00:00"
tier: 3
method: "source-native"
extracted_at: "2026-09-10T17:29:39.018967+00:00"
chars: 10000
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:29:38.999Z"
relevance: 15
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "487b1996ccd0f809"
relevance_by_goal: {"d21cb50b17ba":0,"5a163910d68e":15}
chunks:
  - id: "articles/sketch-blog/1f4ebcec63.md#c0"
    char_span: [0, 107]
    sentence_count: 1
    key_terms: [command-bar-athens, chapter, command, sketch, source, https, bar, blog]
    token_count: 29
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/1f4ebcec63.md#c1"
    char_span: [109, 2491]
    sentence_count: 21
    key_terms: [command, bar, actions, components, new, mode, component, interface]
    concepts: [command, actions, components, component, interface]
    related_chunks: ["articles/sketch-blog/1f4ebcec63.md#c3", "articles/sketch-blog/1f4ebcec63.md#c4"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/1f4ebcec63.md#c2"
    char_span: [2212, 4499]
    sentence_count: 21
    key_terms: [component, press, group, bar, different, new, library, search]
    concepts: [component, press, group, different, library]
    related_chunks: ["articles/sketch-blog/1f4ebcec63.md#c5"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/1f4ebcec63.md#c3"
    char_span: [4189, 6695]
    sentence_count: 20
    key_terms: [component, background, previews, preview, insert, symbol, window, components]
    concepts: [component, background, previews, preview, components]
    related_chunks: ["articles/sketch-blog/1f4ebcec63.md#c1"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/1f4ebcec63.md#c4"
    char_span: [6371, 8850]
    sentence_count: 18
    key_terms: [inspector, components, replace, command, current, bar, replacing, using]
    concepts: [inspector, components, replace, command, current]
    related_chunks: ["articles/sketch-blog/1f4ebcec63.md#c1", "articles/sketch-blog/1f4ebcec63.md#c5"]
    token_count: 512
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
  - id: "articles/sketch-blog/1f4ebcec63.md#c5"
    char_span: [8514, 10110]
    sentence_count: 16
    key_terms: [popover, inspector, group, library, bar, command, current, replacement]
    concepts: [popover, inspector, group, library, command]
    related_chunks: ["articles/sketch-blog/1f4ebcec63.md#c2", "articles/sketch-blog/1f4ebcec63.md#c4"]
    token_count: 346
    sources: [{"n":"sketch_blog","u":"https://www.sketch.com/blog/command-bar-athens/","kind":"article","date":"2025-05-27"}]
---
# A new chapter for the Command Bar

Source: [sketch_blog](https://www.sketch.com/blog/command-bar-athens/)

In our Athens release, we’ve built upon what we introduced in version 100 with the Command Bar, and added the option to insert and replace Components straight from the Command Bar. And for when you’d prefer something smaller and contextual, we took the best of the Command Bar and rethought it for a new popover made for the Inspector. And of course, we packed plenty more: better previews, a quicker way to navigate Libraries and groups, and more.
Let’s take a look at what’s new, how it improves upon the previous workflows, and how it all came to be.
Building on a tested foundation
In version 100, we introduced the Command Bar: a fast, keyboard-first way to surface all the things you can do in Sketch. We audited over 300 existing actions to add icons, colour-coding, and other things needed to make them shine in the Command Bar. We wrote a custom search algorithm so you only need to type parts of an action’s name, an abbreviation, or even just part of its menu path to find it. We also made it learn — entirely locally — from your habits to put the actions you use the most right at the top.
However, we always knew it was just its first chapter. We’d long felt we wanted an interface for inserting Components that made navigating libraries quicker and easier, gave us much more useful previews, and would also work for replacing Components.
Bringing Components to the Command Bar
You can now insert and replace every kind of Component from the Command Bar. Taking over from the old Insert Window, and the menus in the toolbar and Inspector, the Command Bar has a new springboard with actions for picking Components. You can also search for these actions, or use the items in the menu bar.
Each of these actions take you into what we call a Command Bar mode. Up until now, the Command Bar had only one mode: actions mode (which is still the default). But now, it has a new one for each Component. I’ll get to the details of each in a moment, but essentially, each one gives you a dedicated interface designed for picking a specific kind of Component. To show you what I mean, let’s take a look at the new Symbols mode.
Looks pretty different to actions, huh? There’s a lot to look at here, so let’s go on a little trek amongst this new interface, and see what’s what. You can always tell when you’re in a different mode by the little purple token to the left of the search field. To exit a mode you can click it, or press the ⌫ key twice with an empty search field.
A quicker path to finding Libraries and groups
While each Component mode has an interface dedicated to their Component type, they all share one other important similarity: the path bar at the top. One of the biggest challenges we faced with bringing Components to the Command Bar was navigating Libraries and groups. We had a lot less space to work with, and we wanted to make something that was quicker and less frustrating than the old Insert Window, and Insert menus.
The first item in the path bar tells you which Library you’re in (or if you’re looking at everything). You can click it to pick a different Library, or press ⌘F. With your hands still on the keyboard use the arrow keys to navigate to a different Library, or to a group therein, then press ⏎. To go back to viewing everything in the Library press ⌥⌘▲, or press ⌘▲ to navigate to the parent of the group you’re in. To navigate to a sibling or subgroup of the current group press ⌘▼ — this will open the menu for the last item in the path bar, and you can use the arrow keys to pick a new group.
To insert any Component, use the arrow keys to select it, and then press ⏎. While we’re talking selection: even if you have a Component selected, like with actions, you can just start typing to refine your search. If you press ▲ while at the top you can also select everything in the search field to start a new query.
The Command Bar is smart about remembering where you left off. So even as you’re flying around the canvas, opening and closing the Command Bar, it’ll remember which group you were in, and which Component you had selected. This makes inserting the same Component, or multiple Components from the same group really easy.
We know that’s a lot of shortcuts to get your head around, but once they become second nature we hope you’ll agree that it makes using the new Component modes very snappy. However, if you prefer to use the mouse, you can click any of the path items to open their menu of sibling (and therefore also sub-) groups, or ⌘-click an item to jump right to that group. You can also double-click a Component, or drag it out straight onto the canvas.
Proper previews
In many cases the Component previews in the old Insert Window, and especially in the Inspector menus weren’t the most helpful. They were either too small, wasted too much space, or didn’t show enough metadata. With the Command Bar we rethought each Component preview to show as much information as possible, and give you the best idea of what a Component will look like before you pick it.
The Symbols grid is more space efficient allowing you to see an extra column of Symbols compared to the same space in the Insert Window. In fact we liked it so much we’re also using it for Frame Templates, and Graphic Templates.
You can also now set light or dark backgrounds for Symbol previews. This one in particular was bothering us for a while, and probably you, too. If you had a Symbol that was predominantly light with a transparent background you’d get a preview with a light background that made the Symbol impossible to see (and vice versa in dark mode). In Components mode you can now choose whether a Symbol has a light background, a dark background, or sticks with the app’s appearance.
We redesigned Text Style previews to provide more room for preview text using the style’s font size (up to a sensible limit). This makes them a much more accurate representation of how text with that style will look. We also include more metadata, and give it more room so it’s less likely to get truncated. Each preview is aligned for easy scanning, and we indicate alignment (if included in the style) with the other metadata.
Layer Styles, and Color Variables share a similar, dense, two-column grid that makes much better use of the available space compared to the Insert Window. Where previously you’d see six Color Variables in the Insert Window you can now see ten in the Command Bar, and for Layer Styles you can now see twelve.
Replacing Components using the Command Bar
Of all the workflows we examined in this project, this is the one we’ve improved the most, and the one we’re most excited about.
To replace Components before Athens, you could only use the Inspector menus where you’d have to dig through submenus, and risk losing your place with one wrong move. We’d been wanting to replace (pun intended) this interface for a while now, and with the Command Bar we think we’ve built something much better.
To replace a Component you only need to remember a single shortcut ⌥⌘R or search for the “Replace Component” action. Both open the Command Bar, and take you straight to the Library or group the current Component belongs to, ready for you to pick a replacement.
By organising your Components into groups — like icons of a certain size — you can have related ones appear when you want to swap one for another. We’ve found this to be particularly helpful for replacing nested Symbols like an icon, or for swapping one button variant for another.
When replacing Symbols, there are a couple of extra controls at the end of the path bar:
- For top-level Symbols, you’ll see a button that lets you choose whether or not the replacement should use the size of the current Symbol, or use its own size. If you were used to the “Swap at Original Size” option in the old Inspector menus, this is that, but with a clearer name: “Preserve current dimensions”.
- For nested Symbols, you’ll instead see a toggle that lets you hide the nested Symbol rather than replace it. Likewise, if you were fond of using the “Hide Layer” option in the Inspector menus this is its replacement.
Replacing Components in the Inspector
I’ll let you into a little secret: our first crack at updating the Inspector used the Command Bar for picking Components. However, once we used it, and as we heard from folks using the beta, we realised this wasn’t ideal. When using the Inspector we wanted something that kept us in our current context even if that meant smaller previews.
When using the Inspector we wanted something that kept us in our current context even if that meant smaller previews.
This led us to rethink (again) how we replace Components in the Inspector. What we created was a brand new popover that takes the best of the Command Bar modes, and shrinks them down into an interface designed for the Inspector — the best of both worlds.
Familiar, but different
To open the new popover just click any of the usual Inspector buttons. With less space to work with we couldn’t just take the same elements from the Command Bar, and squish them. The path bar, for example, just wouldn’t work. So instead we made a nifty popup button that serves a similar role.
You can navigate to a different Library or group by clicking the Library picker button at the top of the popover. Other Libraries are always at the bottom, and towards the top you’ll find the parent groups (and Library) of whichever group you have selected. You can clear any group or Library filter by clicking the ×, or by pressing ⌃⌥⌘▲. Like the Command Bar, the popover automatically opens in the current Component’s group — so if the replacement you want is in that group you don’t need to go anywhere else.
When you find the replacement you want just click it once; or use the arrow keys to select it, and press ⏎. One thing you won’t find in the popover are any animations. We wanted everything about it to feel fast, and once you try it we think you’ll agree: replacing Components this way just feels zippy.
Hone
