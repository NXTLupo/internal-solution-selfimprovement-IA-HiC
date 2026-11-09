---
id: articles/ieee-spectrum-ai/d81f8bbda7.md
url: "https://spectrum.ieee.org/asteroid-shadow"
url_hash: "d81f8bbda7"
kind: "article"
source: "IEEE Spectrum AI"
title: "Measure Distant Asteroids With a DIY Rig"
author: ""
date: "Thu, 24 Sep 2026 13:00:04 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:52:33.440340+00:00"
chars: 6669
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:52:34.102Z"
relevance: 5
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "1413ebd095bb4b75"
relevance_by_goal: {"aa6916010743":5}
chunks:
  - id: "articles/ieee-spectrum-ai/d81f8bbda7.md#c0"
    char_span: [0, 113]
    sentence_count: 1
    key_terms: [spectrum, ieee, asteroid-shadow, asteroids, distant, measure, source, https]
    concepts: [spectrum]
    token_count: 30
    sources: [{"n":"IEEE Spectrum AI","u":"https://spectrum.ieee.org/asteroid-shadow","kind":"article","date":"2026-09-24"}]
  - id: "articles/ieee-spectrum-ai/d81f8bbda7.md#c1"
    char_span: [115, 2584]
    sentence_count: 15
    key_terms: [asteroid, occultation, telescope, shadow, because, measure, camera, earth]
    concepts: [asteroid, occultation, telescope, shadow, because]
    related_chunks: ["articles/ieee-spectrum-ai/d81f8bbda7.md#c3"]
    token_count: 512
    sources: [{"n":"IEEE Spectrum AI","u":"https://spectrum.ieee.org/asteroid-shadow","kind":"article","date":"2026-09-24"}]
  - id: "articles/ieee-spectrum-ai/d81f8bbda7.md#c2"
    char_span: [2277, 4700]
    sentence_count: 20
    key_terms: [flasher, occultation, camera, signal, monochrome, gps, pulse-per-second, images]
    concepts: [flasher, occultation, monochrome, camera, signal]
    token_count: 512
    sources: [{"n":"IEEE Spectrum AI","u":"https://spectrum.ieee.org/asteroid-shadow","kind":"article","date":"2026-09-24"}]
  - id: "articles/ieee-spectrum-ai/d81f8bbda7.md#c3"
    char_span: [4362, 6785]
    sentence_count: 19
    key_terms: [asteroid, star, occultation, time, multiple, occultations, per, wide]
    concepts: [asteroid, occultation, multiple, occultations, kilometers]
    related_chunks: ["articles/ieee-spectrum-ai/d81f8bbda7.md#c1"]
    token_count: 512
    sources: [{"n":"IEEE Spectrum AI","u":"https://spectrum.ieee.org/asteroid-shadow","kind":"article","date":"2026-09-24"}]
---
# Measure Distant Asteroids With a DIY Rig

Source: [IEEE Spectrum AI](https://spectrum.ieee.org/asteroid-shadow)

I’ve seen two total solar eclipses and have been duly impressed by what happens as the moon casts its shadow on Earth. But recently I’ve become even more intrigued by a similar phenomenon that doesn’t involve the sun or the moon—something called an asteroid occultation.
That’s what happens when an asteroid orbits around the solar system and blocks the light of a distant star you’re viewing from Earth. Like the moon during a solar eclipse, the asteroid casts a predictable moving shadow on a swath of Earth’s surface—a small silhouette in the dim light bathing us from that one star.
When such a fortuitous alignment occurs, amateur astronomers can discern things about the asteroid that professionals can’t readily measure, even with their giant telescopes on high mountains. That’s because amateurs are nimble: They can be in just the right place at just the right time to measure an asteroid’s fleeting shadow, which could be just a few hundred meters wide and traveling at tens of kilometers per second. With enough observers, they can collectively map that shadow, revealing the asteroid’s shape.
Even folks on a limited budget can do this, because the size of an asteroid you can measure doesn’t scale with the size of your telescope. If the occulted star is relatively bright, you don’t need much of a telescope at all.
How Do You Catch an Asteroid Occultation?
My own efforts along these lines have been with a modest 5.1-inch-aperture (130-millimeter) Newtonian telescope that sells for about US $300. I attach it to a small equatorial mount ($150) that can track the stars by virtue of some added stepper motors driven by an open-source telescope controller called OnStep. (You could save yourself the time, trouble, and expense of all that DIY hacking by purchasing a motorized mount for as little as $300.)
A flasher provides a calibrated time base for light-curve measurements. It relies on a GPS module [top] to provide a high-accuracy pulse once per second, is gated by an Arduino nano [middle] to prevent flashes occurring at the moment of occultation, and is then passed to a LED [bottom].James Provost
I bought an inexpensive astronomy color camera on Amazon for $260 to take images at the video rates required to capture the rapid changes during an occultation. I chose this camera because it has a relatively large sensor, Sony’s IMX585, which provides a large field of view. A monochrome camera would be better for asteroid occultations, but the monochrome version of this camera is harder to come by and more expensive. If you’re looking for a cheaper option, the monochrome ToupTek G3M662M (about $200) would be a good choice, although its sensor is smaller.
Knowing where and when to catch an occultation in your area is of course critical and can be calculated using free PC software found on the International Occultation Timing Association (IOTA) website. If you plan to contribute your observations to IOTA to increase the body of scientific knowledge about asteroids, you will need to calibrate the timing of your images. You can’t just depend on the time stamps your computer adds to the video frames, which can be way off.
For time calibration, many practitioners use a flasher: a red LED driven from the pulse-per-second signal from a GPS receiver. Asteroid observers use such a pulsing LED positioned in front of their telescopes to calibrate the timing of the images they take. With some effort, it’s possible to reduce the uncertainty to just a handful of milliseconds.
The flasher I built uses a GPS module that I had on hand. But I’d recommend you purchase a different one that accepts an external active antenna. HiLetgo’s NEO-7M $12 module might be a good choice—but don’t forget to remove its antenna-coupling capacitor (marked as C2 on the circuit board) if you do attach an active external antenna to it.
How Do You Make a Telescope Flasher?
You can’t let the flasher just blink away every second, though, because its light might stomp on the very signal you’re trying to detect. So alongside the GPS module, my flasher also contains an Arduino Nano, plus two transistors, three resistors, and a switch. I wired these components together so as to drive the LED directly from the pulse-per-second signal coming from the GPS. The signal passes through a transistor controlled by the Arduino so that the flashes can be started and stopped at prescribed times. I can then program the flasher to produce calibrating pulses near the start and end of each recording session, while suppressing the flashing around the occultation itself.
Over time, an asteroid such as Duccio will pass in front of multiple stars [below]. Each time it does, it will block the light from a star [above] for a time that depends on its width along the line of transit. By combining multiple light curves, it is possible to map the shape of the asteroid.James Provost
So far, I’ve managed to record four occultations that have occurred within easy driving distance of my home in North Carolina. The first was quite short, by an asteroid a mere 4 kilometers wide. The star involved was rather dim, so I really had to squint at my laptop screen to see the star momentarily blink out. The star in my second occultation was brighter, and the dimming much longer, so no squinting was required. My third observation tested the limits of my little telescope with a very dim target star, requiring quite long exposures per video frame (about a third of a second). Thankfully, the asteroid was a big one (120 km wide), so the occultation lasted a few seconds, and I could discern it.
The asteroid I targeted last, named Duccio, is about a dozen kilometers wide and orbits in the main asteroid belt between Mars and Jupiter. Its shadow, moving at a clip of some 24 km per second, took about a half second to pass over me. The star this asteroid blocked was bright enough for me to record the event very distinctly at 24 frames per second, providing excellent time resolution.
Asteroid occultations offer a wonderful natural experiment. And unlike a solar eclipse, observable events probably take place near you multiple times each month. So with a little knowledge and the right gear, you can observe them. You just have to wait for the stars—and the asteroids—to align.
- ESA Launches Probe to Revisit Asteroid Crime Scene ›
- Asteroid Landings Call for Robots With a Soft Touch ›
- Three Steps to Stopping Killer Asteroids ›
David Schneider is a former editor at IEEE Spectrum, and continues to contribute Hands On articles. He holds a bachelor's degree in geology from Yale, a master's in engineering from UC Berkeley, and a doctorate in geology from Columbia.
